const mongoose = require('mongoose');

const StopSchema = new mongoose.Schema(
  {
    stopId: { type: String, required: true },
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false }
);

const RouteSchema = new mongoose.Schema(
  {
    routeName: { type: String, required: true, trim: true },
    stops: {
      type: [StopSchema],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.length >= 2;
        },
        message: 'At least two stops are required',
      },
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Route', RouteSchema);