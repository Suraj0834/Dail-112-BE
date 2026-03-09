// =============================================================================
// controllers/sos.controller.js - SOS Emergency Controller
// =============================================================================

'use strict';

const SosLog = require('../models/SosLog.model');
const User = require('../models/User.model');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * POST /api/sos
 * Trigger SOS emergency - log it, find nearest officer, emit socket event
 */
const triggerSos = async (req, res) => {
    const { latitude, longitude, address, type } = req.body;

    if (!latitude || !longitude) {
        throw new AppError('Latitude and longitude are required', 400);
    }

    // Create SOS log
    const sosLog = await SosLog.create({
        triggeredBy: req.user._id,
        location: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
            address: address || ''
        },
        type: type || 'SOS',
        status: 'ACTIVE'
    });

    // Find nearest on-duty police officer (geospatial query)
    let nearestOfficer = null;
    try {
        nearestOfficer = await User.findOne({
            role: 'police',
            isOnDuty: true,
            currentLocation: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(longitude), parseFloat(latitude)]
                    },
                    $maxDistance: 10000   // 10 km radius
                }
            }
        });
    } catch (geoErr) {
        // $near query can fail if no 2dsphere index or no officer has valid coords
        logger.warn('Geospatial query failed for nearest officer:', geoErr.message);
    }

    // Emit real-time SOS alert via Socket.IO
    const io = req.app.get('io');
    if (io) {
        io.to('police_room').emit('sos_alert', {
            sosId: sosLog._id,
            userId: req.user._id,
            userName: req.user.name,
            userPhone: req.user.phone,
            location: { latitude, longitude, address },
            type: type || 'SOS',
            timestamp: new Date().toISOString()
        });
    }

    logger.info(`SOS triggered by ${req.user.email} at [${latitude}, ${longitude}]`);

    res.status(201).json({
        success: true,
        message: 'Emergency SOS sent! Help is on the way.',
        sosId: sosLog._id,
        nearestOfficer: nearestOfficer ? {
            _id: nearestOfficer._id,
            name: nearestOfficer.name,
            badgeId: nearestOfficer.badgeId,
            phone: nearestOfficer.phone,
            station: nearestOfficer.station,
            profileImage: nearestOfficer.profileImage
        } : null
    });
};

/**
 * GET /api/sos/history
 * Get SOS history for current user
 */
const getSosHistory = async (req, res) => {
    const logs = await SosLog.find({ triggeredBy: req.user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('respondingOfficer', 'name badgeId phone');

    res.status(200).json({
        success: true,
        count: logs.length,
        logs
    });
};

/**
 * GET /api/sos/active
 * Get all currently ACTIVE SOS alerts (police / control room use)
 */
const getActiveSos = async (req, res) => {
    const logs = await SosLog.find({ status: 'ACTIVE' })
        .sort({ createdAt: -1 })
        .populate('triggeredBy', 'name phone')
        .populate('respondingOfficer', 'name badgeId phone');

    res.status(200).json({ success: true, count: logs.length, logs });
};

/**
 * POST /api/sos/:sosId/assign
 * Assign an officer to an active SOS (police / control room only)
 * Emits `sos_assigned` socket event directly to the officer's personal room.
 */
const assignOfficer = async (req, res) => {
    const { sosId } = req.params;
    const { officerId } = req.body;

    if (!officerId) throw new AppError('officerId is required', 400);

    const sosLog = await SosLog.findById(sosId);
    if (!sosLog) throw new AppError('SOS log not found', 404);
    if (sosLog.status === 'RESOLVED') throw new AppError('SOS already resolved', 400);

    const officer = await User.findOne({ _id: officerId, role: 'police' });
    if (!officer) throw new AppError('Officer not found', 404);

    sosLog.respondingOfficer = officerId;
    sosLog.status = 'RESPONDED';
    await sosLog.save();

    // Populate location coords for the response
    const [longitude, latitude] = sosLog.location.coordinates;

    // Emit socket event directly to the officer's personal room
    const io = req.app.get('io');
    if (io) {
        io.to(`user_${officerId}`).emit('sos_assigned', {
            sosId: sosLog._id.toString(),
            latitude,
            longitude,
            address: sosLog.location.address || '',
            type: sosLog.type,
            triggeredBy: {
                name: sosLog.triggeredBy?.name,
                phone: sosLog.triggeredBy?.phone
            },
            timestamp: new Date().toISOString()
        });
        logger.info(`SOS ${sosId} assigned to officer ${officerId} via socket`);
    }

    res.status(200).json({
        success: true,
        message: `SOS assigned to officer ${officer.name}`,
        sosId: sosLog._id,
        officerId
    });
};

module.exports = { triggerSos, getSosHistory, getActiveSos, assignOfficer };
