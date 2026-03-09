// =============================================================================
// models/PcrVan.model.js - PCR (Police Control Room) Van
// =============================================================================
'use strict';

const mongoose = require('mongoose');

const pcrVanSchema = new mongoose.Schema(
    {
        vehicleName: {
            type: String,
            required: [true, 'Vehicle name is required'],
            trim: true,
        },
        plateNo: {
            type: String,
            required: [true, 'Plate number is required'],
            unique: true,
            uppercase: true,
            trim: true,
        },
        model: { type: String, trim: true, default: '' },
        color: { type: String, trim: true, default: 'White' },
        station: { type: String, trim: true, default: '' },
        assignedOfficer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        coDriver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        status: {
            type: String,
            enum: ['Available', 'Busy', 'Off-Duty', 'Maintenance'],
            default: 'Available',
        },
        isVisible: {
            type: Boolean,
            default: true,
        },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [77.2090, 28.6139] }, // [lng, lat]
            address: { type: String, default: '' },
        },
        lastSeen: { type: Date, default: Date.now },
        notes: { type: String, default: '' },
    },
    { timestamps: true, versionKey: false }
);

pcrVanSchema.index({ location: '2dsphere' });
pcrVanSchema.index({ station: 1 });
pcrVanSchema.index({ status: 1 });

const PcrVan = mongoose.model('PcrVan', pcrVanSchema);
module.exports = PcrVan;
