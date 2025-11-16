const mongoose = require('mongoose');

// Admin schema: stores email and bcrypt-hashed password
const AdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'adminDB', // match the actual MongoDB collection name
  }
);

module.exports = mongoose.model('Admin', AdminSchema);