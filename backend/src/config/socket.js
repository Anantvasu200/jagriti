const logger = require('./logger');
const { Incident } = require('../models');

let io = null;
const activeBeacons = new Map(); // key: userId, value: { id, userId, lat, lng, type, timestamp }
const activeSharers = new Map(); // key: userId, value: { userId, lat, lng, timestamp }

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);

    // Send the list of currently active beacons and sharers to the newly connected client
    socket.emit('sos:active_list', Array.from(activeBeacons.values()));
    socket.emit('sharing:active_list', Array.from(activeSharers.values()));

    // Listen for SOS trigger
    socket.on('sos:trigger', async (data) => {
      const { userId, userName, lat, lng, type, city } = data;
      logger.warn(`🚨 SOS triggered by user ${userId} (${userName || 'Anonymous'}) at [${lat}, ${lng}] of type ${type}`);

      const beaconId = `beacon_${userId}`;
      const beaconData = {
        id: beaconId,
        userId,
        userName: userName || 'Anonymous User',
        lat,
        lng,
        type: type || 'other',
        timestamp: new Date()
      };

      activeBeacons.set(userId, beaconData);

      // Broadcast the alert to all connected users
      io.emit('sos:alert', beaconData);

      // Insert SOS into Database so it immediately registers on the heatmap as a community incident
      try {
        await Incident.create({
          title: `Active SOS Panic Beacon (${type || 'Emergency'})`,
          description: `Real-time distress alert triggered by user. Avoid this area or assist if safe.`,
          type: type || 'other',
          date: new Date(),
          location: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          city: city || 'Unknown',
          isVerified: false,
          source: 'community',
          confirmations: 1
        });
        logger.info(`Persisted SOS event to postgres database.`);
      } catch (err) {
        logger.error(`Failed to persist SOS to database:`, err);
      }
    });

    // Listen for SOS live updates (location tracking)
    socket.on('sos:update_location', (data) => {
      const { userId, lat, lng } = data;
      const beacon = activeBeacons.get(userId);
      if (beacon) {
        beacon.lat = lat;
        beacon.lng = lng;
        beacon.timestamp = new Date();
        activeBeacons.set(userId, beacon);

        // Broadcast updated coordinates to all users
        io.emit('sos:location_updated', { userId, lat, lng });
        logger.info(`Updated location for active SOS user ${userId}: [${lat}, ${lng}]`);
      }
    });

    // Listen for SOS resolve (I am Safe)
    socket.on('sos:resolve', (data) => {
      const { userId } = data;
      logger.info(`🟢 SOS resolved by user ${userId}`);

      if (activeBeacons.has(userId)) {
        activeBeacons.delete(userId);
        io.emit('sos:resolved', { userId });
      }
    });

    // --- Live Location Sharing Events (Non-Emergency) ---

    // Listen for live location sharing trigger
    socket.on('sharing:start', (data) => {
      const { userId, lat, lng } = data;
      logger.info(`📍 Live location sharing started by user ${userId} at [${lat}, ${lng}]`);

      const sharerData = {
        userId,
        lat,
        lng,
        timestamp: new Date()
      };

      activeSharers.set(userId, sharerData);

      // Broadcast event to all connected users
      io.emit('sharing:started', sharerData);
    });

    // Listen for live location sharing coordinates updates
    socket.on('sharing:update_location', (data) => {
      const { userId, lat, lng } = data;
      const sharer = activeSharers.get(userId);
      if (sharer) {
        sharer.lat = lat;
        sharer.lng = lng;
        sharer.timestamp = new Date();
        activeSharers.set(userId, sharer);

        // Broadcast updated coordinates to all users
        io.emit('sharing:location_updated', { userId, lat, lng });
      }
    });

    // Listen for live location sharing stop
    socket.on('sharing:stop', (data) => {
      const { userId } = data;
      logger.info(`📍 Live location sharing stopped by user ${userId}`);

      if (activeSharers.has(userId)) {
        activeSharers.delete(userId);
        io.emit('sharing:stopped', { userId });
      }
    });

    // Explicit request to fetch active sharing users
    socket.on('sharing:get_active', () => {
      socket.emit('sharing:active_list', Array.from(activeSharers.values()));
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized!");
  }
  return io;
};

module.exports = { initSocket, getIO };
