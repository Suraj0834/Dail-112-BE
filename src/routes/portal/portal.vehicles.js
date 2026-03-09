// =============================================================================
// backend/src/routes/portal/portal.vehicles.js
// Vehicle management endpoints for the control room portal
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Vehicle = mongoose.model('Vehicle');

// ---------------------------------------------------------------------------
// GET /portal/vehicles  — paginated vehicle list with filters
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
    const { page = 1, limit = 20, search, isStolen, isSuspected, vehicleType } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = {};

    if (search) {
        query.$or = [
            { plateNumber: { $regex: search, $options: 'i' } },
            { ownerName: { $regex: search, $options: 'i' } },
            { model: { $regex: search, $options: 'i' } }
        ];
    }
    if (isStolen !== undefined) query.isStolen = isStolen === 'true';
    if (isSuspected !== undefined) query.isSuspected = isSuspected === 'true';
    if (vehicleType) query.vehicleType = vehicleType.toUpperCase();

    const [vehicles, total] = await Promise.all([
        Vehicle.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Vehicle.countDocuments(query),
    ]);

    res.json({ success: true, vehicles, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// ---------------------------------------------------------------------------
// GET /portal/vehicles/plate/:plateNumber  — search by plate
// ---------------------------------------------------------------------------
router.get('/plate/:plateNumber', async (req, res) => {
    const vehicle = await Vehicle.findOne({ plateNumber: req.params.plateNumber.toUpperCase() });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, vehicle });
});

// ---------------------------------------------------------------------------
// GET /portal/vehicles/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, vehicle });
});

// ---------------------------------------------------------------------------
// POST /portal/vehicles  — create vehicle record
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
    const { plateNumber, ownerName, ownerPhone, vehicleType, model, color } = req.body;
    if (!plateNumber || !ownerName) {
        return res.status(400).json({ success: false, message: 'plateNumber and ownerName required' });
    }

    const existing = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Plate already registered' });

    const vehicle = await Vehicle.create({
        plateNumber: plateNumber.toUpperCase(),
        ownerName,
        ownerPhone,
        vehicleType,
        model,
        color,
        isStolen: false,
        isSuspected: false,
    });

    res.status(201).json({ success: true, vehicle, message: 'Vehicle registered' });
});

// ---------------------------------------------------------------------------
// PUT /portal/vehicles/:id  — update vehicle
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
    const allowed = ['ownerName', 'ownerPhone', 'vehicleType', 'model', 'color', 'isSuspected'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    res.json({ success: true, vehicle });
});

// ---------------------------------------------------------------------------
// PATCH /portal/vehicles/:id/stolen  — flag / unflag as stolen
// ---------------------------------------------------------------------------
router.patch('/:id/stolen', async (req, res) => {
    const { isStolen } = req.body;
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { isStolen }, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    res.json({ success: true, vehicle, message: `Vehicle ${isStolen ? 'flagged as stolen' : 'cleared'}` });
});

module.exports = router;
