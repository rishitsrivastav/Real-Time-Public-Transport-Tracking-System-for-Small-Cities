const mongoose = require('mongoose');

// Bus schema: stores bus inventory and assignments
const BusSchema = new mongoose.Schema(
  {
    busId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    busNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    capacity: {
      type: Number,
      default: 50, // default capacity; can be adjusted per bus
      min: 1,
    },
    // Nullable driver assignment; reference by ObjectId when available
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    // Route reference stored as string (Mongo ObjectId string preferred). We validate existence when possible.
    routeId: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection: 'buses',
  }
);

module.exports = mongoose.model('Bus', BusSchema);