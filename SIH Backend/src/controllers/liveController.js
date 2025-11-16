const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Polyline = require('../models/Polyline');
const { hset, hgetall, lpush, ltrim, lrange } = require('../utils/redisClient');
const { emitBusUpdate } = require('../realtime/socket');
const turf = require('@turf/turf');
const polyline = require('@mapbox/polyline');

// Helper: compute average from last N speed samples (km/h). Returns km/h number.
function computeAverageSpeed(speeds) {
  const nums = speeds
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n >= 0);
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

// Helper: get polyline + stops for a route from Redis (fallback Mongo if missing)
async function getRouteGeometryAndStops(routeId) {
  const redisKey = `route:${routeId}`;
  const cached = await hgetall(redisKey);
  if (cached && cached.polyline && cached.stops) {
    try {
      const coords = JSON.parse(cached.polyline);
      const stops = JSON.parse(cached.stops);
      return { coords, stops };
    } catch (_) {}
  }
  // Fallback from Mongo Polyline (encoded) + Route stops, then push to Redis
  const [polyDoc, routeDoc] = await Promise.all([
    Polyline.findOne({ routeId }),
    Route.findById(routeId)
  ]);
  if (!polyDoc || !routeDoc) return { coords: null, stops: null };
  // Decode encoded polyline to array of [lat,lng]
  const latLng = polyline.decode(polyDoc.geometry); // [[lat, lng], ...]
  // Convert to [lng,lat]
  const coords = latLng.map(([lat, lng]) => [lng, lat]);
  const stops = routeDoc.stops || [];
  // Store in Redis for next time
  await hset(redisKey, {
    polyline: JSON.stringify(coords),
    stops: JSON.stringify(stops)
  });
  return { coords, stops };
}

// Helper: snap point to line and compute distance-along for each stop, and ETA
function computeSnappedAndEtas(coords, stops, busPoint, avgSpeedKmh) {
  if (!coords || !coords.length) return { snapped: null, etaStops: [] };

  // Build LineString and bus Point in [lng,lat]
  const line = turf.lineString(coords);
  const bus = turf.point([busPoint.lng, busPoint.lat]);

  // Snap bus to nearest point on line
  const snapped = turf.nearestPointOnLine(line, bus, { units: 'kilometers' });

  // Turf provides distance along the whole line in properties.location (in chosen units)
  const busDistKm = Number(snapped.properties.location) || 0;

  // Compute ETA for each upcoming stop (in minutes)
  const kmh = Math.max(1, Number(avgSpeedKmh) || 0); // avoid division by zero; min 1 km/h
  const etaStops = (stops || []).map((s) => {
    const p = turf.nearestPointOnLine(line, turf.point([s.longitude, s.latitude]), { units: 'kilometers' });
    const stopDistKm = Number(p.properties.location) || 0;
    let remainingKm = stopDistKm - busDistKm;
    if (remainingKm < 0) remainingKm = 0; // if already passed, 0
    const hours = remainingKm / kmh;
    const minutes = Math.round(hours * 60);
    return { stopId: s.stopId, name: s.name, etaMinutes: minutes };
  });

  return {
    snapped: {
      lat: snapped.geometry.coordinates[1],
      lng: snapped.geometry.coordinates[0],
    },
    etaStops,
  };
}

// POST /api/bus/update-location
// body: { busId, lat, lng, speed }
exports.updateBusLocation = async (req, res) => {
  try {
    const { busId, lat, lng, speed } = req.body || {};
    if (!busId || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      return res.status(400).json({ success: false, message: 'busId, lat, lng are required' });
    }

    const busDoc = await Bus.findOne({ busId }).lean();
    if (!busDoc) return res.status(404).json({ success: false, message: 'Bus not found' });

    const routeId = String(busDoc.routeId);
    const nowIso = new Date().toISOString();
    const redisKey = `bus:${busId}`;

    // Store last location + timestamp
    await hset(redisKey, {
      lastLat: String(lat),
      lastLng: String(lng),
      lastUpdated: nowIso,
      routeId,
    });

    // Store last 3 speeds
    if (Number.isFinite(Number(speed))) {
      await lpush(`bus:${busId}:speeds`, String(speed));
      await ltrim(`bus:${busId}:speeds`, 0, 2);
    }

    // Compute average speed
    const speeds = await lrange(`bus:${busId}:speeds`, 0, 2);
    const avgSpeed = computeAverageSpeed(speeds);

    // Load polyline + stops
    const { coords, stops } = await getRouteGeometryAndStops(routeId);

    // Compute snapped position + ETAs
    const { snapped, etaStops } = computeSnappedAndEtas(
      coords,
      stops,
      { lat: Number(lat), lng: Number(lng) },
      avgSpeed
    );

    const payload = {
      busId,
      routeId,
      snappedLocation: snapped || { lat: Number(lat), lng: Number(lng) },
      avgSpeed: avgSpeed,
      lastUpdated: nowIso,
      etaStops: etaStops || [],
      status: 'online',
    };

    // Emit via websocket to clients on the same route
    emitBusUpdate(routeId, payload);

    return res.status(200).json({ success: true, ...payload });
  } catch (err) {
    console.error('updateBusLocation error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/bus/:id/live - returns last known location + ETA and offline status if >90s
exports.getLiveBus = async (req, res) => {
  try {
    const busId = req.params.id;
    const busDoc = await Bus.findOne({ busId }).lean();
    if (!busDoc) return res.status(404).json({ message: 'Bus not found' });

    const routeId = String(busDoc.routeId);
    const redisKey = `bus:${busId}`;

    const busState = await hgetall(redisKey);
    const speeds = await lrange(`bus:${busId}:speeds`, 0, 2);
    const avgSpeed = computeAverageSpeed(speeds);

    let lastLat = busState?.lastLat ? Number(busState.lastLat) : null;
    let lastLng = busState?.lastLng ? Number(busState.lastLng) : null;
    let lastUpdated = busState?.lastUpdated || null;

    // Offline detection
    let status = 'offline';
    if (lastUpdated) {
      const diff = Date.now() - new Date(lastUpdated).getTime();
      if (diff <= 90 * 1000) status = 'online';
    }

    // Compute ETAs using cached polyline
    const { coords, stops } = await getRouteGeometryAndStops(routeId);

    let snapped = null;
    let etaStops = [];
    if (lastLat != null && lastLng != null) {
      const resComp = computeSnappedAndEtas(
        coords,
        stops,
        { lat: lastLat, lng: lastLng },
        avgSpeed
      );
      snapped = resComp.snapped;
      etaStops = resComp.etaStops;
    }

    const payload = {
      busId,
      routeId,
      snappedLocation: snapped || (lastLat != null && lastLng != null ? { lat: lastLat, lng: lastLng } : null),
      avgSpeed,
      lastUpdated,
      etaStops,
      status,
    };

    return res.status(200).json(payload);
  } catch (err) {
    console.error('getLiveBus error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};