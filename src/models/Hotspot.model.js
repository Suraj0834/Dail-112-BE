// =============================================================================
// models/Hotspot.model.js - AI Crime Hotspot Data
// =============================================================================

'use strict';

const mongoose = require('mongoose');

const hotspotSchema = new mongoose.Schema(
    {
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: [Number]   // [longitude, latitude]
        },
        area: {
            type: String,
            trim: true
        },
        riskScore: {
            type: Number,
            min: 0,
            max: 1,
            required: true
        },
        crimeCount: {
            type: Number,
            default: 0
        },
        clusterLabel: {
            type: Number    // KMeans cluster ID
        },
        dominantCrimeType: String,
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true, versionKey: false }
);

hotspotSchema.index({ location: '2dsphere' });
hotspotSchema.index({ riskScore: -1 });

const Hotspot = mongoose.model('Hotspot', hotspotSchema);
module.exports = Hotspot;
