const Route = require('../models/Route');
const Polyline = require('../models/Polyline');
const { callORSWithRetry } = require('../services/orsService');
const { hset } = require('../utils/redisClient');
const polyline = require('@mapbox/polyline');

function isValidStop(stop) {
  if (!stop || typeof stop !== 'object') return false;
  const { stopId, name, latitude, longitude } = stop;
  const hasStrings = typeof stopId === 'string' && stopId.trim() && typeof name === 'string' && name.trim();
  const hasCoords = typeof latitude === 'number' && Number.isFinite(latitude) && typeof longitude === 'number' && Number.isFinite(longitude);
  return hasStrings && hasCoords;
}

// Fire-and-forget orchestration to compute and store polyline for a saved route
async function computeAndStorePolyline(route) {
  try {
    // Ensure not already created (idempotent)
    const exists = await Polyline.findOne({ routeId: route._id });
    if (exists) return;

    // Convert stops to [lon, lat]
    const coords = route.stops.map((s) => [s.longitude, s.latitude]);

    const { geometry, distance, duration } = await callORSWithRetry(coords);

    // ORS geometry is an encoded polyline string
    const created = await Polyline.create({
      routeId: route._id,
      routeName: route.routeName,
      geometry, // encoded polyline string
      distance,
      duration,
    });

    // Also push decoded coordinates + stops to Redis cache
    try {
      const latLng = polyline.decode(geometry); // [[lat,lng], ...]
      const coordsLngLat = latLng.map(([lat, lng]) => [lng, lat]);
      await hset(`route:${route._id}`, {
        polyline: JSON.stringify(coordsLngLat),
        stops: JSON.stringify(route.stops || [])
      });
    } catch (e) {
      console.warn('Redis HSET for route failed:', e?.message || e);
    }

    return created;
  } catch (err) {
    console.error('computeAndStorePolyline error:', err.message);
  }
}

// POST /api/admin/routes
async function addRoute(req, res) {
  try {
    // Support JSON or text/plain containing JSON
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (e) {}
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid JSON body' });
    }

    const routeName = typeof payload.routeName === 'string' ? payload.routeName.trim() : '';
    const stops = Array.isArray(payload.stops) ? payload.stops : [];

    if (!routeName) {
      return res.status(400).json({ success: false, message: 'routeName is required' });
    }
    if (!Array.isArray(stops) || stops.length < 2) {
      return res.status(400).json({ success: false, message: 'stops must be an array with at least 2 items' });
    }
    for (const s of stops) {
      if (!isValidStop(s)) {
        return res.status(400).json({ success: false, message: 'Each stop must have stopId (string), name (string), latitude (number), longitude (number)' });
      }
    }

    // Check duplicate routeName
    const existing = await Route.findOne({ routeName });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Route name already exists' });
    }

    const route = await Route.create({ routeName, stops });

    // Immediately compute ORS and persist polyline (synchronous to guarantee DB write)
    try {
      await computeAndStorePolyline(route);
    } catch (e) {
      // If ORS fails, return 502 so client can retry or handle accordingly
      return res.status(502).json({ success: false, message: 'Failed to compute route polyline via ORS', detail: String(e.message || e) });
    }

    return res.status(201).json({ success: true, route });
  } catch (err) {
    console.error('addRoute error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// GET /api/admin/routes
async function getAllRoutes(req, res) {
  try {
    const routes = await Route.find({}).sort({ createdAt: -1 });
    return res.status(200).json(routes);
  } catch (err) {
    console.error('getAllRoutes error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/routes-with-polyline
// If query param routeName is provided, returns only that route's polyline (minimal payload)
// Otherwise, returns all routes with their polyline geometry, distance, duration
async function getRoutesWithPolyline(req, res) {
  try {
    const routeNameQuery = typeof req.query.routeName === 'string' ? req.query.routeName.trim() : '';

    if (routeNameQuery) {
      const route = await Route.findOne({ routeName: routeNameQuery });
      if (!route) return res.status(404).json({ message: 'Route not found' });

      let poly = await Polyline.findOne({ routeId: route._id });
      if (!poly) {
        try {
          // Compute synchronously so frontend immediately gets the polyline
          await computeAndStorePolyline(route);
          poly = await Polyline.findOne({ routeId: route._id });
        } catch (e) {
          return res.status(502).json({ message: 'Failed to compute route polyline via ORS', detail: String(e.message || e) });
        }
      }

      if (!poly) {
        return res.status(200).json({
          _id: route._id,
          routeName: route.routeName,
          geometry: null,
          distance: null,
          duration: null,
        });
      }

      return res.status(200).json({
        _id: route._id,
        routeName: route.routeName,
        geometry: poly.geometry,
        distance: poly.distance,
        duration: poly.duration,
      });
    }

    // Default: return all routes with their polylines
    const routes = await Route.find({}).sort({ createdAt: -1 });

    const results = await Promise.all(
      routes.map(async (r) => {
        const polyDB = await Polyline.findOne({ routeId: r._id });
        if (polyDB) {
          return {
            _id: r._id,
            routeName: r.routeName,
            stops: r.stops,
            geometry: polyDB.geometry, // encoded polyline string
            distance: polyDB.distance,
            duration: polyDB.duration,
          };
        }

        // If polyline does not exist yet, trigger computation in background
        computeAndStorePolyline(r).catch(() => {});
        return {
          _id: r._id,
          routeName: r.routeName,
          stops: r.stops,
          geometry: null,
          distance: null,
          duration: null,
        };
      })
    );

    return res.status(200).json(results);
  } catch (err) {
    console.error('getRoutesWithPolyline error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { addRoute, getAllRoutes, getRoutesWithPolyline };