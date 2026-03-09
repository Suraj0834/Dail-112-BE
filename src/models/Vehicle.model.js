// =============================================================================
// models/Vehicle.model.js - Vehicle Registration & Stolen DB
// =============================================================================

'use strict';

const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
    {
        plateNumber: {
            type: String,
            required: [true, 'Plate number is required'],
            unique: true,
            uppercase: true,
            trim: true,
            match: [/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/, 'Invalid Indian plate format']
        },
        ownerName: {
            type: String,
            required: true,
            trim: true
        },
        ownerPhone: {
            type: String,
            required: true
        },
        ownerAadhaar: {
            type: String,
            select: false      // Never return Aadhaar in API responses
        },
        vehicleType: {
            type: String,
            enum: ['TWO_WHEELER', 'FOUR_WHEELER', 'TRUCK', 'BUS', 'OTHER'],
            required: true
        },
        model: {
            type: String,
            required: true,
            trim: true
        },
        color: {
            type: String,
            required: true,
            trim: true
        },
        registrationYear: {
            type: Number
        },
        isStolen: {
            type: Boolean,
            default: false
        },
        isSuspected: {
            type: Boolean,
            default: false
        },
        stolenReportId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Case',
            default: null
        }
    },
    { timestamps: true, versionKey: false }
);

vehicleSchema.index({ plateNumber: 1 });
vehicleSchema.index({ isStolen: 1 });

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
module.exports = Vehicle;
