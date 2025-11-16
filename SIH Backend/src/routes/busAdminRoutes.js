const express = require('express');
const { addBus } = require('../controllers/busController');

const router = express.Router();

// NOTE: Plug your admin auth middleware here if not applied globally on /api/admin
// router.use(require('../middleware/auth'));

// POST /api/admin/buses - Create a new bus (protected)
router.post('/buses', addBus);

module.exports = router;