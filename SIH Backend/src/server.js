require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
// Force DNS servers to public resolvers to allow SRV lookups (fix EREFUSED)
dns.setServers(['8.8.8.8', '1.1.1.1']);

const adminRoutes = require('./routes/adminRoutes');
const driverRoutes = require('./routes/driverRoutes');
const routeRoutes = require('./routes/routeRoutes');
const busRoutes = require('./routes/busRoutes');
const busAdminRoutes = require('./routes/busAdminRoutes');
const driverAppRoutes = require('./routes/driverAppRoutes');
const { initSocket } = require('./realtime/socket');
// const publicRoutes = require('./routes/publicRoutes');

const app = express();

// Middleware
app.use(cors());

// Skip default JSON/urlencoded parsing for driver app to allow tolerant parsing there
app.use((req, res, next) => {
  if (req.path.startsWith('/api/driver')) return next();
  return express.json()(req, res, next);
});
app.use((req, res, next) => {
  if (req.path.startsWith('/api/driver')) return next();
  return express.urlencoded({ extended: true })(req, res, next);
});

// Handle malformed JSON bodies gracefully for non-driver routes
app.use((err, req, res, next) => {
  if (req.path.startsWith('/api/driver')) return next();
  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  next(err);
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin', driverRoutes); // protected middleware should be applied at a higher level
app.use('/api/admin', routeRoutes); // protected middleware should be applied at a higher level
app.use('/api/admin', busAdminRoutes); // admin buses routes
app.use('/api', busRoutes); // public buses endpoint
app.use('/api/driver', driverAppRoutes); // driver app endpoints
// app.use('/api', publicRoutes); // public endpoints

// Mongo connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('Missing MONGO_URI in .env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || 'SIH_DB', // fallback if not set
  })
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
initSocket(server);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));