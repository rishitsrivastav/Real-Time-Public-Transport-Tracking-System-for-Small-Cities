const express = require('express');
const { addDriver, getAllDrivers } = require('../controllers/driverController');

const router = express.Router();

// NOTE: Assuming auth/session middleware exists and is applied at a higher level
// If needed, plug it here: router.use(require('../middleware/auth'));

// POST /api/admin/drivers - Add driver (protected)
router.post('/drivers', addDriver);

// GET /api/admin/drivers - Get all drivers (protected)
router.get('/drivers', getAllDrivers);

module.exports = router;