// =============================================================================
// backend/src/routes/portal/portal.roles.js
// Role & Permission management for admin users
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Role = mongoose.model('Role');

// ---------------------------------------------------------------------------
// GET /portal/roles  — list all roles
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
    const roles = await Role.find().sort({ name: 1 });
    res.json({ success: true, roles });
});

// ---------------------------------------------------------------------------
// GET /portal/roles/:id  — single role
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    res.json({ success: true, role });
});

// ---------------------------------------------------------------------------
// POST /portal/roles  — create a role
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
    const { name, displayName, description, permissions } = req.body;
    if (!name || !displayName) {
        return res.status(400).json({ success: false, message: 'name and displayName are required' });
    }

    const existing = await Role.findOne({ name: name.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Role already exists' });

    const role = await Role.create({
        name: name.toLowerCase(),
        displayName,
        description: description || '',
        permissions: permissions || [],
        isSystem: false,
        isActive: true,
    });

    res.status(201).json({ success: true, role, message: 'Role created' });
});

// ---------------------------------------------------------------------------
// PUT /portal/roles/:id  — update a role
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystem) {
        return res.status(403).json({ success: false, message: 'Cannot modify system role' });
    }

    const allowed = ['displayName', 'description', 'permissions', 'isActive'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) role[f] = req.body[f]; });
    await role.save();

    res.json({ success: true, role, message: 'Role updated' });
});

// ---------------------------------------------------------------------------
// DELETE /portal/roles/:id  — delete non-system role
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res) => {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
    if (role.isSystem) {
        return res.status(403).json({ success: false, message: 'Cannot delete system role' });
    }

    await Role.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Role deleted' });
});

// ---------------------------------------------------------------------------
// GET /portal/roles/permissions/all  — list all available permissions
// ---------------------------------------------------------------------------
router.get('/permissions/all', async (_req, res) => {
    const permissions = [
        // Dashboard
        'dashboard.view',
        // Cases
        'cases.view', 'cases.create', 'cases.update', 'cases.delete', 'cases.assign',
        // SOS
        'sos.view', 'sos.dispatch', 'sos.resolve',
        // Police
        'police.view', 'police.create', 'police.update', 'police.deactivate',
        // Criminals
        'criminals.view', 'criminals.create', 'criminals.update',
        // Vehicles
        'vehicles.view', 'vehicles.create', 'vehicles.update', 'vehicles.flag',
        // Analytics
        'analytics.view',
        // PCR Tracking
        'pcr.view', 'pcr.manage',
        // Roles
        'roles.view', 'roles.manage',
        // Settings
        'settings.view', 'settings.manage',
    ];

    res.json({ success: true, permissions });
});

module.exports = router;
