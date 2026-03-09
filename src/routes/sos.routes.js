// =============================================================================
// routes/sos.routes.js - SOS Emergency Routes
// =============================================================================

'use strict';

const express = require('express');
const { triggerSos, getSosHistory, getActiveSos, assignOfficer } = require('../controllers/sos.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// All SOS routes require authentication
router.use(authenticate);

// POST /api/sos — trigger SOS emergency
router.post('/', triggerSos);

// GET /api/sos/history — user's own SOS history
router.get('/history', getSosHistory);

// GET /api/sos/active — all active alerts (police/control_room only)
router.get('/active', authorize('police', 'control_room', 'admin'), getActiveSos);

// POST /api/sos/:sosId/assign — assign officer to SOS (control_room/admin)
router.post('/:sosId/assign', authorize('police', 'control_room', 'admin'), assignOfficer);

module.exports = router;
