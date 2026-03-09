// =============================================================================
// backend/src/routes/portal/portal.police.js
// Police officer CRUD for control-room web portal
// Uses the existing User model (role = 'police')
// =============================================================================

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = mongoose.model('User');
const Case = mongoose.model('Case');

// ── Upload: use Cloudinary in prod, disk locally ─────────────────────────────
let upload;
if (process.env.CLOUDINARY_CLOUD_NAME) {
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    const cloudinary = require('../../config/cloudinary');
    const cloudStorage = new CloudinaryStorage({
        cloudinary,
        params: { folder: 'dial112/profiles', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] }
    });
    upload = multer({ storage: cloudStorage, limits: { fileSize: 5 * 1024 * 1024 } });
} else {
    const diskSt = multer.diskStorage({
        destination: 'uploads/profiles/',
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
        },
    });
    upload = multer({
        storage: diskSt,
        fileFilter: (req, file, cb) => {
            const allowed = /jpeg|jpg|png|webp/;
            const ext = allowed.test(path.extname(file.originalname).toLowerCase());
            const mime = allowed.test(file.mimetype);
            cb(ext && mime ? null : new Error('Only image files allowed'), ext && mime);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
    });
}

// ---------------------------------------------------------------------------
// GET /portal/police  — all police officers (paginated)
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
    const { page = 1, limit = 20, station, isActive } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = { role: 'police' };

    if (station) query.station = station;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const [officers, total] = await Promise.all([
        User.find(query)
            .select('-password -faceEmbedding')
            .sort({ name: 1 })
            .skip(skip)
            .limit(Number(limit)),
        User.countDocuments(query),
    ]);

    res.json({ success: true, officers, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ---------------------------------------------------------------------------
// GET /portal/police/:id  — single officer detail
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
    const officer = await User.findById(req.params.id).select('-password -faceEmbedding');
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });
    res.json({ success: true, officer });
});

// ---------------------------------------------------------------------------
// POST /portal/police  — onboard new police officer
// ---------------------------------------------------------------------------
router.post('/', upload.single('profileImage'), async (req, res) => {
    const { name, email, phone, password, badgeId, station, rank } = req.body;

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ success: false, message: 'name, email, phone, password required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const officer = await User.create({
        name,
        email: email.toLowerCase(),
        phone,
        password,          // pre-save hook hashes it
        role: 'police',
        badgeId,
        station,
        rank,
        profileImage: req.file ? (req.file.path || `/uploads/profiles/${req.file.filename}`) : null,
        isActive: true,
    });

    res.status(201).json({
        success: true,
        officer: officer.toPublicJSON(),
        message: `Officer ${name} onboarded`,
    });
});

// ---------------------------------------------------------------------------
// PUT /portal/police/:id  — update officer details
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
    const allowedFields = ['name', 'phone', 'station', 'rank', 'badgeId'];
    const updates = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const officer = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
        .select('-password -faceEmbedding');
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });

    res.json({ success: true, officer, message: 'Officer updated' });
});

// ---------------------------------------------------------------------------
// PATCH /portal/police/:id/status  — enable / disable account
// ---------------------------------------------------------------------------
router.patch('/:id/status', async (req, res) => {
    const { isActive } = req.body;
    const officer = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
    ).select('-password -faceEmbedding');

    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });
    res.json({ success: true, officer, message: `Account ${isActive ? 'enabled' : 'disabled'}` });
});

// ---------------------------------------------------------------------------
// PATCH /portal/police/:id/duty  — toggle on-duty status + shift
// ---------------------------------------------------------------------------
router.patch('/:id/duty', async (req, res) => {
    const { isOnDuty, dutyShift } = req.body;
    if (typeof isOnDuty !== 'boolean') {
        return res.status(400).json({ success: false, message: 'isOnDuty (boolean) required' });
    }
    const updates = {
        isOnDuty,
        dutyStartedAt: isOnDuty ? new Date() : null,
    };
    if (dutyShift !== undefined) updates.dutyShift = dutyShift || null;

    const officer = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
        .select('-password -faceEmbedding');
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });
    res.json({ success: true, officer, message: `Officer ${isOnDuty ? 'set on duty' : 'set off duty'}` });
});

// ---------------------------------------------------------------------------
// PATCH /portal/police/:id/password  — admin reset password
// ---------------------------------------------------------------------------
router.patch('/:id/password', async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be ≥ 6 characters' });
    }

    const salt = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashed = await bcrypt.hash(newPassword, salt);
    const officer = await User.findByIdAndUpdate(req.params.id, { password: hashed });
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });

    res.json({ success: true, message: 'Password reset successfully' });
});

// ---------------------------------------------------------------------------
// GET /portal/police/:id/performance  — cases handled by this officer
// ---------------------------------------------------------------------------
router.get('/:id/performance', async (req, res) => {
    const [total, resolved, active] = await Promise.all([
        Case.countDocuments({ assignedOfficer: req.params.id }),
        Case.countDocuments({ assignedOfficer: req.params.id, status: 'Closed' }),
        Case.countDocuments({ assignedOfficer: req.params.id, status: { $ne: 'Closed' } }),
    ]);

    const recentCases = await Case.find({ assignedOfficer: req.params.id })
        .select('title status crimeType createdAt')
        .sort({ createdAt: -1 })
        .limit(5);

    res.json({ success: true, data: { total, resolved, active, recentCases } });
});

module.exports = router;
