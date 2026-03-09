// =============================================================================
// sockets/socketHandler.js - Socket.IO Real-Time Communication
// Handles: SOS alerts, PCR tracking, case status updates
// =============================================================================

'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * initSockets - Bootstrap Socket.IO on the HTTP server
 *
 * Rooms used:
 * - "police_room"       : All online police officers receive SOS/weapon alerts
 * - "user_{userId}"     : Per-user room for case status notifications
 * - "sos_{sosId}"       : Tracking room for active SOS incidents
 */
function initSockets(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: '*',     // Restrict in production
            methods: ['GET', 'POST']
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    });

    // ──────────────────────────────────────────────────────────────────────────
    // JWT Authentication middleware for Socket.IO
    // Every connection must include a valid JWT in handshake auth
    // ──────────────────────────────────────────────────────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.userRole = decoded.role;
            next();

        } catch (err) {
            next(new Error('Invalid authentication token'));
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Connection Handler
    // ──────────────────────────────────────────────────────────────────────────
    io.on('connection', (socket) => {
        logger.info(`Socket connected: ${socket.id} [${socket.userRole}] userId: ${socket.userId}`);

        // Join personal room for targeted notifications
        socket.join(`user_${socket.userId}`);

        // Police officers join the police room for SOS/weapon/case alerts
        if (socket.userRole === 'police') {
            socket.join('police_room');
            logger.info(`Officer ${socket.userId} joined police_room`);
        }

        // Dashboard / control_room monitors join a dedicated tracking room
        if (socket.userRole === 'control_room' || socket.userRole === 'admin') {
            socket.join('dashboard_room');
            logger.info(`Dashboard user ${socket.userId} joined dashboard_room`);
        }

        // ── EVENT: Police officer updates their location (1-second live tracking) ──
        socket.on('update_location', async (data) => {
            const { latitude, longitude } = data;
            if (!latitude || !longitude) return;

            try {
                const User = require('../models/User.model');
                await User.findByIdAndUpdate(socket.userId, {
                    currentLocation: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    isOnDuty: true,
                    lastSeen: new Date()
                });

                // Broadcast to SOS tracking rooms (citizen sees officer moving)
                socket.to('sos_tracking').emit('officer_location_update', {
                    officerId: socket.userId,
                    latitude,
                    longitude,
                    timestamp: new Date().toISOString()
                });

                // Broadcast to dashboard so control room sees all officer positions
                io.to('dashboard_room').emit('officer_location_update', {
                    officerId: socket.userId,
                    latitude,
                    longitude,
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                logger.error('Location update error:', err);
            }
        });

        // ── EVENT: PCR van officer updates van's live location ──
        socket.on('pcr_update_location', async (data) => {
            const { vanId, latitude, longitude, address } = data;
            if (!vanId || !latitude || !longitude) return;

            try {
                const PcrVan = require('../models/PcrVan.model');
                await PcrVan.findByIdAndUpdate(vanId, {
                    location: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)],
                        address: address || ''
                    },
                    lastSeen: new Date()
                });

                // Broadcast to all police and dashboard rooms
                io.to('police_room').emit('pcr_location_update', {
                    vanId,
                    latitude,
                    longitude,
                    timestamp: new Date().toISOString()
                });
                io.to('dashboard_room').emit('pcr_location_update', {
                    vanId,
                    latitude,
                    longitude,
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                logger.error('PCR location update error:', err);
            }
        });

        // ── EVENT: Join SOS tracking room (citizen waiting for officer) ──
        socket.on('join_sos_tracking', (data) => {
            const { sosId } = data;
            if (sosId) {
                socket.join(`sos_${sosId}`);
                logger.info(`User ${socket.userId} joined tracking for SOS ${sosId}`);
            }
        });

        // ── EVENT: Officer responds to SOS ──
        socket.on('sos_respond', async (data) => {
            const { sosId, officerLat, officerLon, eta } = data;
            logger.info(`Officer ${socket.userId} responding to SOS ${sosId}`);

            // Notify the SOS room (citizen's device) about officer response
            io.to(`sos_${sosId}`).emit('officer_responding', {
                officerId: socket.userId,
                latitude: officerLat,
                longitude: officerLon,
                eta: eta || 'Estimated 5 minutes',
                timestamp: new Date().toISOString()
            });

            // Update SOS Log in DB
            try {
                const SosLog = require('../models/SosLog.model');
                await SosLog.findByIdAndUpdate(sosId, {
                    respondingOfficer: socket.userId,
                    status: 'RESPONDED'
                });
            } catch (err) {
                logger.error('SOS respond DB error:', err);
            }
        });

        // ── EVENT: Mark officer as off duty ──
        socket.on('go_off_duty', async () => {
            try {
                const User = require('../models/User.model');
                await User.findByIdAndUpdate(socket.userId, { isOnDuty: false });
                socket.leave('police_room');
                logger.info(`Officer ${socket.userId} went off duty`);
            } catch (err) {
                logger.error('Off duty update error:', err);
            }
        });

        // ── EVENT: Disconnect ──
        socket.on('disconnect', async (reason) => {
            logger.info(`Socket disconnected: ${socket.id} (${reason})`);

            // Mark police officer as off duty when they disconnect
            if (socket.userRole === 'police') {
                try {
                    const User = require('../models/User.model');
                    await User.findByIdAndUpdate(socket.userId, { isOnDuty: false });
                } catch (err) {
                    logger.error('Disconnect cleanup error:', err);
                }
            }
        });
    });

    // Expose io on app for use in controllers
    io.on('error', (err) => {
        logger.error('Socket.IO error:', err);
    });

    // Store io reference in a way controllers can access it
    // This is set in server.js: httpServer.locals.io ... instead we'll pass via app
    return io;
}

module.exports = { initSockets };
