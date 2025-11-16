const express = require('express');
const bcrypt = require('bcrypt');
const Admin = require('../models/Admin');

const router = express.Router();

// POST /api/admin/login
// Body: { email, password }
router.post('/login', async (req, res) => {
  try {
    // Debug log to diagnose empty body issues
    // Note: remove or reduce in production
    console.log('Login headers:', req.headers);
    console.log('Login body:', req.body);

    // Accept JSON body OR text/plain containing JSON
    let email, password;
    if (typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        email = parsed?.email;
        password = parsed?.password;
      } catch (e) {
        // fall through; will trigger validation error below
      }
    } else if (req.body && typeof req.body === 'object') {
      ({ email, password } = req.body);
    }

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ loginSuccess: false, message: 'Email and password are required' });
    }

    // Normalize email
    const normalizedEmail = String(email).toLowerCase().trim();

    // Find admin by email
    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) {
      console.log('Login debug: admin not found for email:', normalizedEmail);
      return res.status(200).json({ loginSuccess: false, message: 'Invalid credentials' });
    }

    // Compare password using bcrypt
    const isMatch = await bcrypt.compare(String(password), admin.password);
    console.log('Login debug: adminId:', String(admin._id), 'isMatch:', isMatch);
    if (!isMatch) {
      return res.status(200).json({ loginSuccess: false, message: 'Invalid credentials' });
    }

    // Success: return adminId
    return res.status(200).json({ loginSuccess: true, adminId: admin._id });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ loginSuccess: false, message: 'Server error' });
  }
});

module.exports = router;