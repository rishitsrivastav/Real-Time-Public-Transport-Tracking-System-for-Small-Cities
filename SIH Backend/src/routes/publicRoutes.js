const express = require('express');
const { getRoutesWithPolyline } = require('../controllers/routeController');

const router = express.Router();

// Public: GET /api/routes-with-polyline - All routes with polyline, distance, duration
router.get('/routes-with-polyline', getRoutesWithPolyline);

module.exports = router;