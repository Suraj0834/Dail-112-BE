// =============================================================================
// backend/src/routes/portal/portal.cases.js
// Case management endpoints for the control room portal
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Case = mongoose.model('Case');
const User = mongoose.model('User');
require('../../models/Criminal.model');
const Criminal = mongoose.model('Criminal');

// ---------------------------------------------------------------------------
// GET /portal/cases  — paginated list with filters
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
    const { status, category, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = {};

    if (status) query.status = status.toUpperCase();
    if (category) query.category = category.toUpperCase();
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const [cases, total] = await Promise.all([
        Case.find(query)
            .populate('filedBy', 'name phone email')
            .populate('assignedOfficer', 'name badgeId station')
            .populate('suspect', 'name dangerLevel photo category')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Case.countDocuments(query),
    ]);

    res.json({
        success: true,
        data: {
            cases,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit))
        }
    });
});

// ---------------------------------------------------------------------------
// GET /portal/cases/:id  — single case with full details
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
    const caseDoc = await Case.findById(req.params.id)
        .populate('filedBy', 'name phone email')
        .populate('assignedOfficer', 'name badgeId station phone')
        .populate('suspect', 'name dangerLevel photo category')
        .populate('timeline.updatedBy', 'name');

    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });
    res.json({ success: true, case: caseDoc });
});

// ---------------------------------------------------------------------------
// PATCH /portal/cases/:id/status  — update case status
// ---------------------------------------------------------------------------
router.patch('/:id/status', async (req, res) => {
    const { status, note } = req.body;
    const validStatuses = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];
    if (!status || !validStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({
            success: false,
            message: `status must be one of: ${validStatuses.join(', ')}`
        });
    }

    const upper = status.toUpperCase();
    const caseDoc = await Case.findByIdAndUpdate(
        req.params.id,
        {
            status: upper,
            $push: {
                timeline: {
                    status: upper,
                    note: note || `Status changed to ${upper}`,
                    updatedBy: req.user._id,
                    timestamp: new Date()
                }
            }
        },
        { new: true }
    ).populate('filedBy', 'name phone email')
     .populate('assignedOfficer', 'name badgeId station');

    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    // Real-time update
    const io = req.app.get('io');
    if (io) io.emit('case_updated', { caseId: caseDoc._id, status: upper });

    res.json({ success: true, case: caseDoc, message: `Case status updated to ${upper}` });
});

// ---------------------------------------------------------------------------
// PATCH /portal/cases/:id/assign  — assign officer to case
// ---------------------------------------------------------------------------
router.patch('/:id/assign', async (req, res) => {
    const { officerId } = req.body;
    if (!officerId) {
        return res.status(400).json({ success: false, message: 'officerId is required' });
    }

    const officer = await User.findOne({ _id: officerId, role: 'police' });
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });

    const caseDoc = await Case.findByIdAndUpdate(
        req.params.id,
        {
            assignedOfficer: officerId,
            $push: {
                timeline: {
                    status: 'INVESTIGATING',
                    note: `Assigned to Officer ${officer.name}`,
                    updatedBy: req.user._id,
                    timestamp: new Date()
                }
            }
        },
        { new: true }
    ).populate('filedBy', 'name phone email')
     .populate('assignedOfficer', 'name badgeId station');

    if (!caseDoc) return res.status(404).json({ success: false, message: 'Case not found' });

    res.json({ success: true, case: caseDoc, message: `Assigned to ${officer.name}` });
});

module.exports = router;
