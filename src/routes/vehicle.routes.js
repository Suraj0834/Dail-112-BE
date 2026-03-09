// =============================================================================
// routes/vehicle.routes.js - Vehicle Lookup Route
// =============================================================================

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth.middleware');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.use(authenticate);

// GET /api/vehicles/:number
router.get('/:number', async (req, res) => {
    const plateNumber = req.params.number.toUpperCase().trim();
    if (plateNumber.length < 4) throw new AppError('Invalid plate number', 400);

    const Vehicle = mongoose.model('Vehicle');
    const vehicle = await Vehicle.findOne({ plateNumber });

    if (!vehicle) {
        return res.status(404).json({ success: false, message: `No vehicle found: ${plateNumber}` });
    }

    res.status(200).json({ success: true, vehicle });
});

module.exports = router;
