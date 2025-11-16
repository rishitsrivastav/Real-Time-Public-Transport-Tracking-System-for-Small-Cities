const express = require('express');
const {
  loginDriver,
  getAssignedBusForDriver,
  getDriverProfile,
} = require('../controllers/driverController');

const router = express.Router();

// Tolerant body parsing for driver app (accept any content-type as text)
router.use(express.text({ type: '*/*' }));

// Driver App APIs
// POST /api/driver/login
router.post('/login', loginDriver);

// GET /api/driver/:username/bus
router.get('/:username/bus', getAssignedBusForDriver);

// GET /api/driver/:username/profile
router.get('/:username/profile', getDriverProfile);

module.exports = router;