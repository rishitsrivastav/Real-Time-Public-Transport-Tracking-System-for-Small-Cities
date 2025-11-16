const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid');
const mongoose = require('mongoose');
const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const Route = require('../models/Route');
const { sendEmail } = require('../utils/email');
const { generateRandomPassword } = require('../utils/password');

const SALT_ROUNDS = 10;

// Validate request body for required fields
function validateAddDriverBody(body) {
  if (!body || typeof body !== 'object') return 'Invalid JSON body';
  const { name, email, phone } = body;
  if (!name || !email || !phone) return 'name, email, and phone are required';
  return null;
}

async function addDriver(req, res) {
  try {
    // Accept JSON or text/plain JSON
    let payload = req.body;
    if (typeof req.body === 'string') {
      try { payload = JSON.parse(req.body); } catch (e) {}
    }

    const validationError = validateAddDriverBody(payload);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const name = String(payload.name).trim();
    const email = String(payload.email).toLowerCase().trim();
    const phone = String(payload.phone).trim();

    // Check duplicate email
    const existing = await Driver.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    // Generate sequential username: driver_num_1, driver_num_2, ...
    let username;
    try {
      const agg = await Driver.aggregate([
        { $match: { username: { $regex: '^driver_num_\\d+$' } } },
        { $project: { num: { $toInt: { $arrayElemAt: [{ $split: ['$username', '_'] }, 2] } } } },
        { $sort: { num: -1 } },
        { $limit: 1 },
      ]);
      const startNum = agg.length ? agg[0].num + 1 : 1;
      // Try a few sequential numbers to avoid rare race conditions
      for (let offset = 0; offset < 10; offset++) {
        const candidate = `driver_num_${startNum + offset}`;
        const clash = await Driver.findOne({ username: candidate });
        if (!clash) {
          username = candidate;
          break;
        }
      }
    } catch (e) {}
    if (!username) {
      return res.status(500).json({ success: false, message: 'Failed to generate unique username' });
    }

    // Generate and hash password
    const plaintextPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(plaintextPassword, SALT_ROUNDS);

    // Create driver
    const driverDoc = await Driver.create({
      name,
      email,
      phone,
      username,
      passwordHash,
      assignedBus: 'No',
      status: 'active',
    });

    // Send welcome email (best-effort)
    try {
      const subject = 'Welcome to Bus Tracking System';
      const bodyText = `Hello ${name},\n\nYou have been added as a driver.\nUsername: ${username}\nPassword: ${plaintextPassword}\n\nPlease login to the Driver App using these credentials.`;
      await sendEmail({ to: email, subject, text: bodyText });
    } catch (mailErr) {
      console.error('Email send error:', mailErr?.message || mailErr);
      // Non-fatal: proceed with success response as per spec
    }

    return res.status(201).json({
      success: true,
      driver: {
        id: String(driverDoc._id),
        name: driverDoc.name,
        email: driverDoc.email,
        phone: driverDoc.phone,
        username: driverDoc.username,
        assignedBus: driverDoc.assignedBus,
        status: driverDoc.status,
      },
      password: plaintextPassword, // one-time return
    });
  } catch (err) {
    console.error('addDriver error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getAllDrivers(req, res) {
  try {
    const drivers = await Driver.find({}).sort({ createdAt: -1 });
    const result = drivers.map((d) => ({
      id: String(d._id),
      name: d.name,
      email: d.email,
      phone: d.phone,
      username: d.username,
      assignedBus: d.assignedBus,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
    return res.status(200).json(result);
  } catch (err) {
    console.error('getAllDrivers error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

// Driver App: Login
async function loginDriver(req, res) {
  try {
    // Accept JSON objects, JSON strings, or loosely formatted strings
    let body = req.body;
    if (typeof body === 'string') {
      let str = body.trim();
      // Normalize common non-JSON inputs: single quotes, smart quotes
      str = str
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
        .replace(/[\u201C\u201D\u201E\u201F]/g, '"');
      // If it looks like key=value&key2=value2, convert to JSON
      if (!str.startsWith('{') && /^(?:[^=&]+=[^=&]*)(?:&[^=&]+=[^=&]*)*$/.test(str)) {
        const obj = {};
        str.split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k) obj[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
        });
        body = obj;
      } else {
        // Try parsing as JSON; fallback to empty
        try { body = JSON.parse(str); } catch { body = {}; }
      }
    } else if (!body || typeof body !== 'object') {
      body = {};
    }

    // Support multiple client payload field names
    const emailOrUsername = (body.emailOrUsername || body.username || body.email || '').toString().trim();
    const password = (body.password || '').toString();

    if (!emailOrUsername || !password) {
      return res.status(400).json({ success: false, message: 'emailOrUsername (or username/email) and password are required' });
    }

    const query = emailOrUsername.includes('@')
      ? { email: String(emailOrUsername).toLowerCase().trim() }
      : { username: String(emailOrUsername).toLowerCase().trim() };

    const driver = await Driver.findOne(query).select('+passwordHash');
    if (!driver) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(String(password), driver.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      driver: {
        username: driver.username,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        assignedBus: driver.assignedBus,
      },
    });
  } catch (err) {
    console.error('loginDriver error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Helper: fetch bus by various assignment strategies
async function resolveAssignedBus(driver) {
  const assigned = driver.assignedBus;
  if (!assigned || assigned === 'No') return null;

  // Try by ObjectId
  if (mongoose.Types.ObjectId.isValid(assigned)) {
    const byId = await Bus.findById(assigned);
    if (byId) return byId;
  }

  // Try by busId field
  let bus = await Bus.findOne({ busId: assigned });
  if (bus) return bus;

  // Try by busNumber
  bus = await Bus.findOne({ busNumber: assigned });
  if (bus) return bus;

  // Fallbacks: driver assignments
  // - By driver ObjectId
  bus = await Bus.findOne({ driverId: driver._id });
  if (bus) return bus;
  // - By username if the collection stores assignedDriver as username
  bus = await Bus.findOne({ assignedDriver: driver.username });
  return bus || null;
}

function mapStopsToOutput(stopsArr) {
  if (!Array.isArray(stopsArr)) return [];
  return stopsArr.map((s) => ({
    stopName: s.name || s.stopName || '',
    lat: typeof s.latitude === 'number' ? s.latitude : s.lat,
    lng: typeof s.longitude === 'number' ? s.longitude : s.lng,
  }));
}

// Driver App: Fetch assigned bus details
async function getAssignedBusForDriver(req, res) {
  try {
    const username = String(req.params.username || '').toLowerCase().trim();
    if (!username) {
      return res.status(400).json({ success: false, message: 'username is required' });
    }

    const driver = await Driver.findOne({ username });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (driver.assignedBus === 'No') {
      return res.status(404).json({ success: false, message: 'No bus assigned' });
    }

    const busDoc = await resolveAssignedBus(driver);
    if (!busDoc) {
      return res.status(404).json({ success: false, message: 'Assigned bus not found' });
    }

    let routeOut = [];
    if (busDoc.routeId) {
      const routeDoc = await Route.findById(busDoc.routeId);
      if (routeDoc && Array.isArray(routeDoc.stops)) {
        routeOut = mapStopsToOutput(routeDoc.stops);
      }
    }
    // In case route is embedded (defensive support)
    if (!routeOut.length && Array.isArray(busDoc.route)) {
      routeOut = mapStopsToOutput(busDoc.route);
    }

    return res.status(200).json({
      success: true,
      bus: {
        busNumber: busDoc.busNumber,
        capacity: busDoc.capacity,
        status: busDoc.status,
        route: routeOut,
      },
    });
  } catch (err) {
    console.error('getAssignedBusForDriver error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

// Driver App: Profile
async function getDriverProfile(req, res) {
  try {
    const username = String(req.params.username || '').toLowerCase().trim();
    if (!username) {
      return res.status(400).json({ success: false, message: 'username is required' });
    }

    const driver = await Driver.findOne({ username });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    return res.status(200).json({
      success: true,
      driver: {
        username: driver.username,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        status: driver.status,
        assignedBus: driver.assignedBus,
      },
    });
  } catch (err) {
    console.error('getDriverProfile error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { addDriver, getAllDrivers, loginDriver, getAssignedBusForDriver, getDriverProfile };