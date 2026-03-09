// =============================================================================
// models/Criminal.model.js - Criminal Database for Face Recognition
// =============================================================================

'use strict';

const mongoose = require('mongoose');

const criminalSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        aadhar: {
            type: String,
            select: false
        },
        photo: {
            type: String,    // URL to face photo
            required: false
        },
        age: {
            type: Number
        },
        gender: {
            type: String
        },
        lastKnownAddress: {
            type: String
        },
        faceEmbedding: {
            type: [Number],  // 128-d FaceNet embedding vector
            required: false,
            select: false    // Don't expose embeddings in API
        },
        hasEmbedding: {
            type: Boolean,   // True when faceEmbedding is stored — used to show indexing status in UI
            default: false
        },
        crimeHistory: [{
            caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
            offense: String,
            date: Date,
            status: String
        }],
        isActive: {
            type: Boolean,
            default: true
        },
        dangerLevel: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'MEDIUM'
        },
        warrantStatus: {
            type: Boolean,
            default: false
        },
        description: String
    },
    { timestamps: true, versionKey: false }
);

criminalSchema.index({ name: 'text' });

const Criminal = mongoose.model('Criminal', criminalSchema);
module.exports = Criminal;
