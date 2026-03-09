// =============================================================================
// models/SosLog.model.js - SOS Emergency Log Model
// =============================================================================

'use strict';

const mongoose = require('mongoose');

/**
 * SosLogSchema - Records every SOS emergency event
 * Used for:
 * - Dispatching nearest police officer
 * - Historical crime analysis
 * - AI hotspot prediction training data
 */
const sosLogSchema = new mongoose.Schema(
    {
        // Who triggered the SOS
        triggeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },

        // GeoJSON location of emergency
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],   // [longitude, latitude]
                required: true
            },
            address: String
        },

        // Type of emergency
        type: {
            type: String,
            enum: ['SOS', 'ACCIDENT', 'FIRE', 'MEDICAL', 'SOS_UPDATE'],
            default: 'SOS'
        },

        // Resolved status
        status: {
            type: String,
            enum: ['ACTIVE', 'RESPONDED', 'RESOLVED', 'FALSE_ALARM'],
            default: 'ACTIVE'
        },

        // Nearest officer dispatched
        respondingOfficer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },

        // Response time in seconds
        responseTimeSeconds: {
            type: Number,
            default: null
        },

        resolvedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

sosLogSchema.index({ location: '2dsphere' });
sosLogSchema.index({ triggeredBy: 1, createdAt: -1 });
sosLogSchema.index({ status: 1 });

const SosLog = mongoose.model('SosLog', sosLogSchema);
module.exports = SosLog;

