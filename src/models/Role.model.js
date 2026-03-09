// =============================================================================
// models/Role.model.js - Role & Permissions Model
// =============================================================================

'use strict';

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Role name is required'],
            unique: true,
            trim: true,
            lowercase: true
        },
        displayName: {
            type: String,
            required: [true, 'Display name is required'],
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ''
        },
        permissions: [{
            type: String,
            trim: true
        }],
        isSystem: {
            type: Boolean,
            default: false      // System roles can't be deleted
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true, versionKey: false }
);

roleSchema.index({ name: 1 });

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;
