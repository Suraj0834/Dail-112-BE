// =============================================================================
// routes/cases.routes.js - FIR / Case Routes
// =============================================================================

'use strict';

const express = require('express');
const {
    createCase,
    getUserCases,
    getCaseById,
    updateCase,
    assignOfficer
} = require('../controllers/cases.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { uploadImage } = require('../middleware/upload.middleware');

const router = express.Router();

// All case routes require authentication
router.use(authenticate);

// POST /api/cases - File new FIR (with optional image upload)
router.post('/', uploadImage.single('image'), createCase);

// GET /api/cases - List all cases for current user (paginated)
router.get('/', getUserCases);

// GET /api/cases/:id - Get single case with timeline
router.get('/:id', getCaseById);

// PUT /api/cases/:id - Update case status (Police only)
router.put('/:id', authorize('police'), updateCase);

// POST /api/cases/:id/assign - Assign officer (Police only)
router.post('/:id/assign', authorize('police'), assignOfficer);

module.exports = router;
