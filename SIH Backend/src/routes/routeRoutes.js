const express = require('express');
const { addRoute, getAllRoutes, getRoutesWithPolyline } = require('../controllers/routeController');

const router = express.Router();

// NOTE: Plug your admin auth middleware here if not applied globally on /api/admin
// router.use(require('../middleware/auth'));

// POST /api/admin/routes - Create a new route (protected)
router.post('/routes', addRoute);

// GET /api/admin/routes - Get all routes (protected)
router.get('/routes', getAllRoutes);

// Public: GET /api/admin/routes-with-polyline - All routes with polyline, distance, duration
router.get('/routes-with-polyline', getRoutesWithPolyline);

module.exports = router;