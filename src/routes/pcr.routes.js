// =============================================================================
// routes/pcr.routes.js - PCR Van Routes
// =============================================================================

'use strict';

const express = require('express');
const { getAllVans, getMyVan, updateVan, updateVanLocation } = require('../controllers/pcr.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.use(authorize('police', 'control_room', 'admin'));

// GET  /api/pcr-vans         — list all PCR vans
router.get('/', getAllVans);

// GET  /api/pcr-vans/mine    — get van assigned to me
router.get('/mine', getMyVan);

// PATCH /api/pcr-vans/:id         — update van details
router.patch('/:id', updateVan);

// PATCH /api/pcr-vans/:id/location — update van GPS
router.patch('/:id/location', updateVanLocation);

module.exports = router;
