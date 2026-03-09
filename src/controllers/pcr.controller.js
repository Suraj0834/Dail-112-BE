// =============================================================================
// controllers/pcr.controller.js - PCR Van Management
// =============================================================================

'use strict';

const PcrVan = require('../models/PcrVan.model');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * GET /api/pcr-vans
 * List all PCR vans (police/control_room)
 */
const getAllVans = async (req, res) => {
    const vans = await PcrVan.find({ isVisible: true })
        .populate('assignedOfficer', 'name badgeId phone')
        .populate('coDriver', 'name badgeId phone')
        .sort({ status: 1, updatedAt: -1 });

    res.status(200).json({ success: true, count: vans.length, vans });
};

/**
 * GET /api/pcr-vans/mine
 * Get the PCR van assigned to the requesting officer
 */
const getMyVan = async (req, res) => {
    const van = await PcrVan.findOne({
        $or: [
            { assignedOfficer: req.user._id },
            { coDriver: req.user._id }
        ]
    })
        .populate('assignedOfficer', 'name badgeId phone profileImage')
        .populate('coDriver', 'name badgeId phone profileImage');

    if (!van) {
        return res.status(200).json({ success: true, van: null, message: 'No PCR van assigned to you' });
    }

    res.status(200).json({ success: true, van });
};

/**
 * PATCH /api/pcr-vans/:id
 * Update van info (status, notes, assignedOfficer, etc.)
 * Only assigned officer or admin may update
 */
const updateVan = async (req, res) => {
    const { id } = req.params;
    const van = await PcrVan.findById(id);
    if (!van) throw new AppError('PCR van not found', 404);

    // Only assigned officer, co-driver, or admin can update
    const isAssigned =
        van.assignedOfficer?.toString() === req.user._id.toString() ||
        van.coDriver?.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'control_room'].includes(req.user.role);

    if (!isAssigned && !isAdmin) {
        throw new AppError('You are not assigned to this PCR van', 403);
    }

    const allowed = ['status', 'notes', 'model', 'color', 'station', 'vehicleName'];
    allowed.forEach((field) => {
        if (req.body[field] !== undefined) van[field] = req.body[field];
    });

    // Admin can also reassign officers
    if (isAdmin) {
        if (req.body.assignedOfficer !== undefined) van.assignedOfficer = req.body.assignedOfficer || null;
        if (req.body.coDriver !== undefined) van.coDriver = req.body.coDriver || null;
    }

    await van.save();

    logger.info(`PCR van ${id} updated by ${req.user.email}`);

    res.status(200).json({ success: true, message: 'PCR van updated', van });
};

/**
 * PATCH /api/pcr-vans/:id/location
 * Update PCR van GPS location (REST fallback; prefer socket `pcr_update_location`)
 */
const updateVanLocation = async (req, res) => {
    const { id } = req.params;
    const { latitude, longitude, address } = req.body;

    if (!latitude || !longitude) throw new AppError('latitude and longitude are required', 400);

    const van = await PcrVan.findById(id);
    if (!van) throw new AppError('PCR van not found', 404);

    const isAssigned =
        van.assignedOfficer?.toString() === req.user._id.toString() ||
        van.coDriver?.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'control_room'].includes(req.user.role);

    if (!isAssigned && !isAdmin) throw new AppError('Not assigned to this van', 403);

    van.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address: address || ''
    };
    van.lastSeen = new Date();
    await van.save();

    // Also broadcast via socket so dashboard updates without reload
    const io = req.app.get('io');
    if (io) {
        io.to('police_room').emit('pcr_location_update', { vanId: id, latitude, longitude, timestamp: new Date().toISOString() });
        io.to('dashboard_room').emit('pcr_location_update', { vanId: id, latitude, longitude, timestamp: new Date().toISOString() });
    }

    res.status(200).json({ success: true, message: 'Location updated' });
};

module.exports = { getAllVans, getMyVan, updateVan, updateVanLocation };
