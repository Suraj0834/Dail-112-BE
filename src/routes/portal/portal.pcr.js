// =============================================================================
// routes/portal/portal.pcr.js  — PCR Van management (full CRUD)
// =============================================================================
'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PcrVan = mongoose.model('PcrVan');
const User   = mongoose.model('User');

// ---------------------------------------------------------------------------
// GET /portal/pcr  — list all PCR vans (with assigned officer populated)
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
    const { status, station, isVisible } = req.query;
    const query = {};
    if (status)    query.status    = status;
    if (station)   query.station   = station;
    if (isVisible !== undefined) query.isVisible = isVisible === 'true';

    const vans = await PcrVan.find(query)
        .populate('assignedOfficer', 'name badgeId station rank phone profileImage')
        .populate('coDriver', 'name badgeId station rank phone profileImage')
        .sort({ createdAt: -1 });

    res.json({ success: true, vans, total: vans.length });
});

// ---------------------------------------------------------------------------
// GET /portal/pcr/:id  — single PCR van
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
    const van = await PcrVan.findById(req.params.id)
        .populate('assignedOfficer', 'name badgeId station rank phone profileImage')
        .populate('coDriver', 'name badgeId station rank phone profileImage');
    if (!van) return res.status(404).json({ success: false, message: 'PCR van not found' });
    res.json({ success: true, van });
});

// ---------------------------------------------------------------------------
// POST /portal/pcr  — create a new PCR van
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
    const { vehicleName, plateNo, model, color, station, assignedOfficer, coDriver, status, notes, location, isVisible } = req.body;
    if (!vehicleName || !plateNo) {
        return res.status(400).json({ success: false, message: 'vehicleName and plateNo are required' });
    }

    // Verify officer exists if provided
    if (assignedOfficer) {
        const officer = await User.findOne({ _id: assignedOfficer, role: 'police' });
        if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });
    }

    const van = await PcrVan.create({
        vehicleName, plateNo, model, color, station,
        assignedOfficer: assignedOfficer || null,
        coDriver: coDriver || null,
        status: status || 'Available',
        isVisible: isVisible !== undefined ? isVisible : true,
        notes: notes || '',
        location: location || undefined,
    });

    const populated = await van.populate([
        { path: 'assignedOfficer', select: 'name badgeId station rank phone profileImage' },
        { path: 'coDriver',        select: 'name badgeId station rank phone profileImage' },
    ]);
    res.status(201).json({ success: true, van: populated });
});

// ---------------------------------------------------------------------------
// PUT /portal/pcr/:id  — full update of a PCR van
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
    const { vehicleName, plateNo, model, color, station, assignedOfficer, coDriver, status, notes, isVisible } = req.body;

    if (assignedOfficer) {
        const officer = await User.findOne({ _id: assignedOfficer, role: 'police' });
        if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });
    }

    const updateData = { vehicleName, plateNo, model, color, station,
          assignedOfficer: assignedOfficer || null,
          coDriver: coDriver || null,
          status, notes };
    if (isVisible !== undefined) updateData.isVisible = isVisible;

    const van = await PcrVan.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).populate('assignedOfficer', 'name badgeId station rank phone profileImage')
     .populate('coDriver', 'name badgeId station rank phone profileImage');

    if (!van) return res.status(404).json({ success: false, message: 'PCR van not found' });
    res.json({ success: true, van });
});

// ---------------------------------------------------------------------------
// PATCH /portal/pcr/:id/visibility  — toggle isVisible on/off
// ---------------------------------------------------------------------------
router.patch('/:id/visibility', async (req, res) => {
    const { isVisible } = req.body;
    if (typeof isVisible !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isVisible (boolean) is required' });
    }
    const van = await PcrVan.findByIdAndUpdate(req.params.id, { isVisible }, { new: true })
        .populate('assignedOfficer', 'name badgeId station rank phone profileImage');
    if (!van) return res.status(404).json({ success: false, message: 'PCR van not found' });
    res.json({ success: true, van });
});

// ---------------------------------------------------------------------------
// PATCH /portal/pcr/:id/status  — change status
// ---------------------------------------------------------------------------
router.patch('/:id/status', async (req, res) => {
    const { status } = req.body;
    const allowed = ['Available', 'Busy', 'Off-Duty', 'Maintenance'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
    }
    const van = await PcrVan.findByIdAndUpdate(req.params.id, { status }, { new: true })
        .populate('assignedOfficer', 'name badgeId station rank phone profileImage');
    if (!van) return res.status(404).json({ success: false, message: 'PCR van not found' });
    res.json({ success: true, van });
});

// ---------------------------------------------------------------------------
// PATCH /portal/pcr/:id/officer  — reassign officer
// ---------------------------------------------------------------------------
router.patch('/:id/officer', async (req, res) => {
    const { officerId } = req.body; // null = unassign
    if (officerId) {
        const officer = await User.findOne({ _id: officerId, role: 'police' });
        if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });
    }
    const van = await PcrVan.findByIdAndUpdate(
        req.params.id,
        { assignedOfficer: officerId || null },
        { new: true }
    ).populate('assignedOfficer', 'name badgeId station rank phone profileImage');
    if (!van) return res.status(404).json({ success: false, message: 'PCR van not found' });
    res.json({ success: true, van });
});

// ---------------------------------------------------------------------------
// PATCH /portal/pcr/:id/location  — update GPS location (from device)
// ---------------------------------------------------------------------------
router.patch('/:id/location', async (req, res) => {
    const { latitude, longitude, address } = req.body;
    if (!latitude || !longitude) {
        return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }
    const van = await PcrVan.findByIdAndUpdate(
        req.params.id,
        {
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)],
                address: address || '',
            },
            lastSeen: new Date(),
        },
        { new: true }
    );
    if (!van) return res.status(404).json({ success: false, message: 'PCR van not found' });

    // Broadcast to socket clients
    const io = req.app.get('io');
    if (io) {
        io.to('portal').emit('pcr_location_update', {
            vanId: van._id,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            status: van.status,
            timestamp: new Date().toISOString(),
        });
    }
    res.json({ success: true, van });
});

// ---------------------------------------------------------------------------
// DELETE /portal/pcr/:id  — remove PCR van
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
    const van = await PcrVan.findByIdAndDelete(req.params.id);
    if (!van) return res.status(404).json({ success: false, message: 'PCR van not found' });
    res.json({ success: true, message: 'PCR van removed' });
});

module.exports = router;
