const express = require('express');
const { getAllBuses } = require('../controllers/busController');
const { updateBusLocation, getLiveBus } = require('../controllers/liveController');

const router = express.Router();

// GET /api/buses - Public endpoint to get all buses (cached)
router.get('/buses', getAllBuses);

// POST /api/bus/update-location - Driver pushes live location
router.post('/bus/update-location', updateBusLocation);

// GET /api/bus/:id/live - Last known location + ETA
router.get('/bus/:id/live', getLiveBus);

module.exports = router;