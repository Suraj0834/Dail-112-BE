// =============================================================================
// backend/src/routes/portal.routes.js
// Web Portal-specific API routes (extends existing backend)
// All routes require police/admin authentication
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();

const { authenticate, authorize } = require('../middleware/auth.middleware');

// ── Portal sub-routers ────────────────────────────────────────────────────────
const dashboardRoutes = require('./portal/portal.dashboard');
const portalSosRoutes = require('./portal/portal.sos');
const portalPolice = require('./portal/portal.police');
const portalCriminals = require('./portal/portal.criminals');
const portalVehicles = require('./portal/portal.vehicles');
const portalCases = require('./portal/portal.cases');
const portalRoles = require('./portal/portal.roles');
const portalPcr = require('./portal/portal.pcr');

// ── All portal routes require auth + police/admin role ────────────────────────
router.use(authenticate);
router.use(authorize('police', 'admin', 'control_room'));

router.use('/dashboard', dashboardRoutes);
router.use('/sos', portalSosRoutes);
router.use('/police', portalPolice);
router.use('/criminals', portalCriminals);
router.use('/vehicles', portalVehicles);
router.use('/cases', portalCases);
router.use('/roles', portalRoles);
router.use('/pcr-vans', portalPcr);

module.exports = router;
