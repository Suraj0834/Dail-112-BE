// =============================================================================
// controllers/cases.controller.js - FIR / Case Management Controller
// =============================================================================

'use strict';

const path = require('path');
const Case = require('../models/Case.model');
const User = require('../models/User.model');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * POST /api/cases
 * File a new FIR / complaint
 */
const createCase = async (req, res) => {
    const { title, description, category, latitude, longitude, address } = req.body;

    if (!title || !description || !category || !latitude || !longitude) {
        throw new AppError('Title, description, category, latitude, and longitude are required', 400);
    }

    // Build image URL if file was uploaded
    let imageUrl = null;
    if (req.file) {
        // Cloudinary uploads set req.file.path to the CDN URL; disk storage needs manual URL
        imageUrl = req.file.path || `${process.env.BASE_URL || 'http://localhost:5001'}/uploads/images/${req.file.filename}`;
    }

    const newCase = await Case.create({
        title: title.trim(),
        description: description.trim(),
        category: category.toUpperCase(),
        location: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
            address: address || ''
        },
        imageUrl,
        filedBy: req.user._id,
        status: 'PENDING',
        timeline: [{
            status: 'PENDING',
            note: 'Case registered successfully. Awaiting officer assignment.',
            updatedBy: req.user._id
        }]
    });

    // Emit socket event to alert police
    const io = req.app.get('io');
    if (io) {
        io.to('police_room').emit('new_case', {
            caseId: newCase._id,
            title: newCase.title,
            category: newCase.category,
            location: { latitude, longitude, address },
            filedBy: req.user.name
        });
    }

    logger.info(`New case filed: ${newCase._id} by ${req.user.email}`);

    res.status(201).json({
        success: true,
        message: 'Case filed successfully',
        case: await newCase.populate('filedBy', 'name email phone')
    });
};

/**
 * GET /api/cases
 * Get all cases for the logged-in user (citizen: own cases, police: assigned cases)
 */
const getUserCases = async (req, res) => {
    const query = req.user.role === 'police'
        ? { assignedOfficer: req.user._id }
        : { filedBy: req.user._id };

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [cases, total] = await Promise.all([
        Case.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('assignedOfficer', 'name badgeId phone profileImage station'),
        Case.countDocuments(query)
    ]);

    res.status(200).json({
        success: true,
        cases,
        total,
        page,
        pages: Math.ceil(total / limit)
    });
};

/**
 * GET /api/cases/:id
 * Get a single case by ID (FIR timeline view)
 */
const getCaseById = async (req, res) => {
    const { id } = req.params;

    const foundCase = await Case.findById(id)
        .populate('filedBy', 'name phone email')
        .populate('assignedOfficer', 'name badgeId phone profileImage station rank');

    if (!foundCase) {
        throw new AppError('Case not found', 404);
    }

    // Access control: citizens can only view own cases
    if (req.user.role === 'citizen' &&
        foundCase.filedBy._id.toString() !== req.user._id.toString()) {
        throw new AppError('Access denied', 403);
    }

    res.status(200).json({
        success: true,
        case: foundCase
    });
};

/**
 * PUT /api/cases/:id
 * Update case status (Police only)
 */
const updateCase = async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
        throw new AppError('Status is required', 400);
    }

    const validStatuses = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status.toUpperCase())) {
        throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const updatedCase = await Case.findByIdAndUpdate(
        id,
        {
            $set: { status: status.toUpperCase() },
            $push: {
                timeline: {
                    status: status.toUpperCase(),
                    note: notes || `Status updated to ${status}`,
                    updatedBy: req.user._id
                }
            }
        },
        { new: true, runValidators: true }
    ).populate('assignedOfficer', 'name badgeId phone profileImage station');

    if (!updatedCase) {
        throw new AppError('Case not found', 404);
    }

    // Notify the case filer via socket
    const io = req.app.get('io');
    if (io) {
        io.to(`user_${updatedCase.filedBy.toString()}`).emit('case_updated', {
            caseId: updatedCase._id,
            status: updatedCase.status,
            note: notes
        });
    }

    logger.info(`Case ${id} updated to ${status} by ${req.user.email}`);

    res.status(200).json({
        success: true,
        message: 'Case updated successfully',
        case: updatedCase
    });
};

/**
 * POST /api/cases/:id/assign
 * Assign a police officer to a case (Police / Admin only)
 */
const assignOfficer = async (req, res) => {
    const { id } = req.params;
    const { officerId } = req.body;

    const officer = await User.findOne({ _id: officerId, role: 'police' });
    if (!officer) {
        throw new AppError('Police officer not found', 404);
    }

    const updatedCase = await Case.findByIdAndUpdate(
        id,
        {
            $set: { assignedOfficer: officerId, status: 'INVESTIGATING' },
            $push: {
                timeline: {
                    status: 'INVESTIGATING',
                    note: `Officer ${officer.name} (Badge: ${officer.badgeId}) assigned`,
                    updatedBy: req.user._id
                }
            }
        },
        { new: true }
    ).populate('assignedOfficer', 'name badgeId phone profileImage station');

    if (!updatedCase) {
        throw new AppError('Case not found', 404);
    }

    res.status(200).json({
        success: true,
        message: 'Officer assigned successfully',
        case: updatedCase
    });
};

module.exports = { createCase, getUserCases, getCaseById, updateCase, assignOfficer };
