// =============================================================================
// models/Case.model.js - FIR / Complaint Case Model
// =============================================================================

'use strict';

const mongoose = require('mongoose');

/**
 * TimelineSchema - Embeds progress updates within a Case
 */
const timelineSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['PENDING', 'INVESTIGATING', 'RESOLVED', 'CLOSED'],
        required: true
    },
    note: {
        type: String,
        trim: true,
        default: ''
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

/**
 * CaseSchema - FIR / Complaint case document
 */
const caseSchema = new mongoose.Schema(
    {
        // ── Basic Info ────────────────────────────────────────────────────────
        title: {
            type: String,
            required: [true, 'Case title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters']
        },
        description: {
            type: String,
            required: [true, 'Case description is required'],
            trim: true,
            maxlength: [5000, 'Description cannot exceed 5000 characters']
        },
        category: {
            type: String,
            enum: ['THEFT', 'CYBERCRIME', 'VIOLENCE', 'FRAUD', 'HARASSMENT', 'ACCIDENT', 'OTHER'],
            required: [true, 'Category is required']
        },

        // ── Location (GeoJSON for spatial queries) ────────────────────────────
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
            address: {
                type: String,
                trim: true
            }
        },

        // ── Status & Timeline ─────────────────────────────────────────────────
        status: {
            type: String,
            enum: ['PENDING', 'INVESTIGATING', 'RESOLVED', 'CLOSED'],
            default: 'PENDING'
        },
        timeline: [timelineSchema],

        // ── Evidence ──────────────────────────────────────────────────────────
        imageUrl: {
            type: String,
            default: null
        },
        imagePublicId: {
            type: String,
            default: null
        },

        // ── Relations ─────────────────────────────────────────────────────────
        filedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        assignedOfficer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        suspect: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Criminal',
            default: null
        },

        // ── AI Classification ─────────────────────────────────────────────────
        aiCategory: {
            type: String,
            default: null
        },
        aiConfidence: {
            type: Number,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

// =============================================================================
// INDEXES
// =============================================================================

caseSchema.index({ location: '2dsphere' });             // Geospatial clustering
caseSchema.index({ filedBy: 1, createdAt: -1 });        // User's case list
caseSchema.index({ status: 1 });                         // Filter by status
caseSchema.index({ category: 1 });                       // Filter by category
caseSchema.index({ assignedOfficer: 1 });               // Officer's assigned cases

const Case = mongoose.model('Case', caseSchema);
module.exports = Case;

