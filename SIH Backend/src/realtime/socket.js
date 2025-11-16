// Socket.IO initialization and helpers
const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*', // adjust if you want to restrict origins
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Client subscribes to a specific route room to receive bus updates
    socket.on('subscribe:route', ({ routeId }) => {
      if (routeId) socket.join(`route:${routeId}`);
    });

    socket.on('unsubscribe:route', ({ routeId }) => {
      if (routeId) socket.leave(`route:${routeId}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

function emitBusUpdate(routeId, payload) {
  if (!io) return;
  const room = routeId ? `route:${routeId}` : undefined;
  if (room) io.to(room).emit('bus:update', payload);
  else io.emit('bus:update', payload);
}

module.exports = { initSocket, getIO, emitBusUpdate };