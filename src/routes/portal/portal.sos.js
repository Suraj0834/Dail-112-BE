// =============================================================================
// backend/src/routes/portal/portal.sos.js
// SOS management endpoints for the web control room portal
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SosLog = mongoose.model('SosLog');
const User = mongoose.model('User');

// ---------------------------------------------------------------------------
// GET /portal/sos  — paginated list with optional status filter
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
    const { status, page = 1, limit = 30 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = status ? { status } : {};

    const [data, total] = await Promise.all([
        SosLog.find(query)
            .populate('triggeredBy', 'name phone email')
            .populate('respondingOfficer', 'name badgeId station')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        SosLog.countDocuments(query),
    ]);

    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ---------------------------------------------------------------------------
// POST /portal/sos/:id/dispatch — assign officer to SOS alert
// ---------------------------------------------------------------------------
router.post('/:id/dispatch', async (req, res) => {
    const { officerId } = req.body;
    if (!officerId) {
        return res.status(400).json({ success: false, message: 'officerId required' });
    }

    const [sos, officer] = await Promise.all([
        SosLog.findById(req.params.id),
        User.findById(officerId),
    ]);

    if (!sos) return res.status(404).json({ success: false, message: 'SOS not found' });
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });

    sos.respondingOfficer = officerId;
    sos.status = 'RESPONDED';
    await sos.save();

    // Emit real-time update on the existing socket channel
    const io = req.app.get('io');
    if (io) {
        io.to('police').emit('sos_dispatched', {
            sosId: sos._id,
            officerId,
            officerName: officer.name,
        });
    }

    res.json({ success: true, data: sos, message: `Officer ${officer.name} dispatched` });
});

// ---------------------------------------------------------------------------
// PUT /portal/sos/:id/resolve — mark SOS as resolved
// ---------------------------------------------------------------------------
router.put('/:id/resolve', async (req, res) => {
    const sos = await SosLog.findByIdAndUpdate(
        req.params.id,
        { status: 'RESOLVED' },
        { new: true }
    );
    if (!sos) return res.status(404).json({ success: false, message: 'SOS not found' });

    res.json({ success: true, data: sos, message: 'SOS resolved' });
});

module.exports = router;
