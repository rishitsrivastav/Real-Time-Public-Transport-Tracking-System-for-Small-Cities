const Bus = require('../models/Bus');
const Route = require('../models/Route');
const Driver = require('../models/Driver');
const { nanoid } = require('nanoid');

// Helpers
function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidStatus(s) {
  return s === 'active' || s === 'inactive';
}

// POST /api/admin/buses - Add a new bus
// Accepts JSON body with { busNumber, driverUsername (nullable), routeName, status?, capacity? }
// - Validates payload
// - Ensures routeName and driverUsername (if provided) exist in DB
// - Auto-generates busId on the backend (prefix 'b' + nanoid)
// - Stores driverId (ObjectId) and routeId (Route._id string) in the bus document
exports.addBus = async (req, res) => {
  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (_) { payload = {}; }
    }

    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid JSON body' });
    }

    const busNumber = normalizeString(payload.busNumber);
    const routeName = normalizeString(payload.routeName || payload.route || '');
    const driverUsername = payload.driverUsername === null || payload.driverUsername === undefined
      ? null
      : normalizeString(payload.driverUsername);

    const capacity = Number.isFinite(Number(payload.capacity)) ? Number(payload.capacity) : undefined;

    let status = normalizeString(payload.status);
    if (!isValidStatus(status)) status = 'active';

    // Basic validations
    if (!busNumber) return res.status(400).json({ success: false, message: 'busNumber is required' });
    if (!routeName) return res.status(400).json({ success: false, message: 'routeName is required' });

    // Ensure the route exists by routeName
    const route = await Route.findOne({ routeName }).lean();
    if (!route) {
      return res.status(400).json({ success: false, message: 'Route not found for provided routeName' });
    }

    // If driverUsername provided, ensure driver exists and capture _id
    let driverId = null;
    if (driverUsername) {
      const driver = await Driver.findOne({ username: driverUsername }).lean();
      if (!driver) {
        return res.status(400).json({ success: false, message: 'Driver not found for provided username' });
      }
      driverId = driver._id;
    }

    // Ensure unique busNumber (avoid duplicates)
    const numberConflict = await Bus.findOne({ busNumber }).lean();
    if (numberConflict) {
      return res.status(409).json({ success: false, message: 'busNumber already exists' });
    }

    // Generate a unique busId and ensure it does not collide (extremely rare)
    let busId;
    for (let i = 0; i < 3; i++) {
      busId = 'b' + nanoid(12);
      const idConflict = await Bus.findOne({ busId }).lean();
      if (!idConflict) break;
      busId = null;
    }
    if (!busId) {
      return res.status(500).json({ success: false, message: 'Failed to generate unique busId' });
    }

    // Build document: store references as IDs
    const busDoc = {
      busId,
      busNumber,
      routeId: String(route._id), // store route ObjectId string for consistency
      status,
    };
    if (capacity !== undefined) busDoc.capacity = capacity;
    if (driverId) busDoc.driverId = driverId; // keep null if not provided

    // Try to create; if rare duplicate-key on busId occurs, retry once
    let created;
    try {
      created = await Bus.create(busDoc);
    } catch (err) {
      if (err && err.code === 11000 && err.keyPattern && err.keyPattern.busId) {
        busDoc.busId = 'b' + nanoid(12);
        created = await Bus.create(busDoc);
      } else if (err && err.code === 11000 && err.keyPattern && err.keyPattern.busNumber) {
        return res.status(409).json({ success: false, message: 'busNumber already exists' });
      } else {
        throw err;
      }
    }

    // If a driver was provided, set driver's assignedBus to the created bus _id (as string)
    try {
      if (driverId && created && created._id) {
        await Driver.updateOne(
          { _id: driverId },
          { $set: { assignedBus: String(created._id) } }
        );
      }
    } catch (linkErr) {
      console.error('Failed to update driver.assignedBus:', linkErr?.message || linkErr);
      // Non-fatal: bus is created; driver assignment can be fixed later if needed
    }

    return res.status(201).json({ success: true, bus: created });
  } catch (err) {
    console.error('addBus error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/buses - Public: get all buses with lightweight route details
exports.getAllBuses = async (_req, res) => {
  try {
    // 1) Fetch buses with core fields only
    const buses = await Bus.find(
      {},
      {
        busId: 1,
        busNumber: 1,
        capacity: 1,
        driverId: 1,
        routeId: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .lean();

    if (!buses || buses.length === 0) {
      return res.status(200).json([]);
    }

    // 2) Collect unique routeIds and fetch corresponding routes (project minimal fields)
    const uniqueRouteIdStrings = Array.from(
      new Set(
        buses
          .map(b => (b && b.routeId ? String(b.routeId) : null))
          .filter(Boolean)
      )
    );

    const { Types } = require('mongoose');
    const routeObjectIds = uniqueRouteIdStrings
      .map(idStr => {
        try { return new Types.ObjectId(idStr); } catch (_) { return null; }
      })
      .filter(Boolean);

    const routes = routeObjectIds.length
      ? await Route.find(
          { _id: { $in: routeObjectIds } },
          {
            routeName: 1,
            stops: 1,
          }
        ).lean()
      : [];

    // Build a map for quick lookup by stringified _id
    const routeIdToData = new Map(
      routes.map(r => [String(r._id), r])
    );

    // 3) Attach minimal route info to each bus, transforming stops to { name, lat, lng }
    const result = buses.map(b => {
      const r = b && b.routeId ? routeIdToData.get(String(b.routeId)) : null;
      const minimalRoute = r
        ? {
            _id: r._id,
            routeName: r.routeName,
            stops: Array.isArray(r.stops)
              ? r.stops.map(s => ({
                  name: s && s.name !== undefined ? s.name : undefined,
                  lat: s && s.latitude !== undefined ? s.latitude : undefined,
                  lng: s && s.longitude !== undefined ? s.longitude : undefined,
                }))
              : [],
          }
        : null;

      return {
        ...b,
        route: minimalRoute,
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('getAllBuses error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};