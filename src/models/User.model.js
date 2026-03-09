// =============================================================================
// models/User.model.js - MongoDB User Model
// Handles both Citizen and Police officer accounts
// =============================================================================

'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * UserSchema - MongoDB schema for all users
 *
 * Supports two roles:
 * - citizen: Can file FIRs, trigger SOS, track cases
 * - police: Can update cases, access AI tools, view SOS alerts
 */
const userSchema = new mongoose.Schema(
    {
        // ── Personal Info ─────────────────────────────────────────────────────
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters']
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false     // Never returned in queries by default
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            match: [/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number']
        },

        // ── Role & Access ─────────────────────────────────────────────────────
        role: {
            type: String,
            enum: ['citizen', 'police', 'admin', 'control_room'],
            default: 'citizen'
        },

        // ── Police-Specific Fields ────────────────────────────────────────────
        badgeId: {
            type: String,
            sparse: true       // Allows multiple null values (only police have badgeId)
        },
        station: {
            type: String,
            trim: true
        },
        rank: {
            type: String,
            trim: true
        },

        // ── Profile ───────────────────────────────────────────────────────────
        profileImage: {
            type: String,     // URL to uploaded image
            default: null
        },

        // ── Location (for online police officers) ─────────────────────────────
        currentLocation: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],   // [longitude, latitude]
                default: [0, 0]
            }
        },
        isOnDuty: {
            type: Boolean,
            default: false
        },
        dutyShift: {
            type: String,
            enum: ['Morning', 'Evening', 'Night'],
            default: null,
        },
        dutyStartedAt: {
            type: Date,
            default: null,
        },

        // ── Account Status ────────────────────────────────────────────────────
        isActive: {
            type: Boolean,
            default: true
        },
        lastLogin: {
            type: Date
        },

        // ── Face Embedding (for face recognition) ─────────────────────────────
        faceEmbedding: {
            type: [Number],   // 128-dimensional FaceNet embedding
            default: null,
            select: false
        },

        // ── Password Reset (OTP-based) ────────────────────────────────────────
        resetOtp: {
            type: String,
            default: null,
            select: false    // Never exposed in normal queries
        },
        resetOtpExpiry: {
            type: Date,
            default: null,
            select: false
        }
    },
    {
        timestamps: true,     // Adds createdAt, updatedAt automatically
        versionKey: false
    }
);

// =============================================================================
// INDEXES - For fast geospatial queries and lookups
// =============================================================================

userSchema.index({ currentLocation: '2dsphere' });    // Geospatial for nearest officer
userSchema.index({ email: 1 });                        // Fast email lookups
userSchema.index({ role: 1, isOnDuty: 1 });           // Filter active police

// =============================================================================
// MIDDLEWARE - Pre-save password hashing
// =============================================================================

/**
 * Hash password before saving to database
 * Only re-hashes if password field was actually modified
 */
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * comparePassword - Safely compare plain text with hashed password
 */
userSchema.methods.comparePassword = async function (plainPassword) {
    return bcrypt.compare(plainPassword, this.password);
};

/**
 * toPublicJSON - Remove sensitive fields from response
 */
userSchema.methods.toPublicJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.faceEmbedding;
    return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
