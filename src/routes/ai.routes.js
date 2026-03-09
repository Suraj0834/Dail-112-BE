// =============================================================================
// routes/ai.routes.js - AI Microservice Proxy Routes
// =============================================================================

'use strict';

const express = require('express');
const {
    recognizeFace,
    detectNumberPlate,
    detectWeapon,
    classifyComplaint,
    getCrimeHotspots,
    chat
} = require('../controllers/ai.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { uploadToMemory } = require('../middleware/upload.middleware');

const router = express.Router();

// All AI routes require authentication
router.use(authenticate);

// POST /api/ai/face-recognition (Police + Admin)
router.post('/face-recognition', authorize('police', 'admin'), uploadToMemory.single('file'), recognizeFace);

// POST /api/ai/anpr (Police + Admin)
router.post('/anpr', authorize('police', 'admin'), uploadToMemory.single('file'), detectNumberPlate);

// POST /api/ai/detect-weapon (Police + Admin)
router.post('/detect-weapon', authorize('police', 'admin'), uploadToMemory.single('file'), detectWeapon);

// POST /api/ai/classify-complaint (Any authenticated user)
router.post('/classify-complaint', classifyComplaint);

// GET /api/ai/hotspots (Any authenticated user)
router.get('/hotspots', getCrimeHotspots);

// POST /api/ai/chat
router.post('/chat', chat);

module.exports = router;
