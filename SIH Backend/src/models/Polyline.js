const mongoose = require('mongoose');

const PolylineSchema = new mongoose.Schema(
  {
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true, index: true, unique: true },
    routeName: { type: String, required: true, trim: true },
    geometry: { type: String, required: true }, // encoded polyline string from ORS
    distance: { type: Number, required: false }, // in meters
    duration: { type: Number, required: false }, // in seconds
  },
  { timestamps: true, collection: 'polylines' }
);

module.exports = mongoose.model('Polyline', PolylineSchema);