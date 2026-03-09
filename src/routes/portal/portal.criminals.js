'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const Criminal = mongoose.model('Criminal');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_API_KEY     = process.env.AI_SERVICE_API_KEY || '';

// ── Multer: memory storage so we have buffer for AI embedding + Cloudinary ─────
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const ok = /jpe?g|png|webp/.test(path.extname(file.originalname).toLowerCase());
        cb(ok ? null : new Error('Image files only'), ok);
    },
    limits: { fileSize: 8 * 1024 * 1024 },
});

// ── Helper: upload buffer to Cloudinary (prod) or disk (dev) ─────────────────
async function savePhoto(buffer, originalname) {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        const cloudinary = require('../../config/cloudinary');
        return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'dial112/criminals', resource_type: 'image' },
                (err, result) => err ? reject(err) : resolve(result.secure_url)
            );
            stream.end(buffer);
        });
    }
    // Local fallback
    const filename = `${Date.now()}-${originalname.replace(/\s+/g, '_')}`;
    const dir  = require('path').join(__dirname, '../../../uploads/criminals');
    require('fs').mkdirSync(dir, { recursive: true });
    require('fs').writeFileSync(require('path').join(dir, filename), buffer);
    return `/uploads/criminals/${filename}`;
}

// ── Helper: call AI service to extract face embedding from image buffer ───────
async function extractEmbedding(buffer, filename, mimeType) {
    try {
        const form = new FormData();
        form.append('file', buffer, { filename: filename || 'photo.jpg', contentType: mimeType || 'image/jpeg' });
        const res = await axios.post(`${AI_SERVICE_URL}/ai/extract-embedding`, form, {
            headers: { ...form.getHeaders(), 'X-API-Key': AI_API_KEY },
            timeout: 30000,
        });
        if (res.data?.success && res.data?.embedding?.length > 0) {
            return res.data.embedding;
        }
    } catch (e) {
        console.warn(`[criminals] Embedding extraction failed: ${e.message}`);
    }
    return null;
}

// ---------------------------------------------------------------------------
// GET /portal/criminals
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
    const { page = 1, limit = 15, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = search
        ? { name: { $regex: search, $options: 'i' } }
        : {};

    const [criminals, total] = await Promise.all([
        Criminal.find(query)
            .select('-faceEmbedding')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Criminal.countDocuments(query),
    ]);

    res.json({ success: true, criminals, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ---------------------------------------------------------------------------
// GET /portal/criminals/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
    const criminal = await Criminal.findById(req.params.id).select('-faceEmbedding');
    if (!criminal) return res.status(404).json({ success: false, message: 'Criminal record not found' });
    res.json({ success: true, criminal });
});

// ---------------------------------------------------------------------------
// POST /portal/criminals  — create new criminal record
// ---------------------------------------------------------------------------
router.post('/', upload.single('photo'), async (req, res) => {
    const { name, age, gender, dangerLevel, lastKnownAddress, offense } = req.body;

    if (!name) return res.status(400).json({ success: false, message: 'name is required' });

    // Save photo to disk and extract face embedding in parallel
    let photoUrl  = undefined;
    let embedding = null;

    if (req.file) {
        photoUrl  = await savePhoto(req.file.buffer, req.file.originalname);
        embedding = await extractEmbedding(req.file.buffer, req.file.originalname, req.file.mimetype);
    }

    const criminal = await Criminal.create({
        name,
        age: age ? Number(age) : undefined,
        gender,
        dangerLevel: dangerLevel || 'MEDIUM',
        lastKnownAddress,
        photo: photoUrl,
        faceEmbedding: embedding || [],
        hasEmbedding: !!embedding,
        crimeHistory: offense ? [{ offense, date: new Date() }] : [],
        warrantStatus: false,
        isActive: true,
    });

    const out = criminal.toObject();
    delete out.faceEmbedding;
    res.status(201).json({ success: true, criminal: out, message: 'Criminal record created' });
});

// ---------------------------------------------------------------------------
// PUT /portal/criminals/:id
// ---------------------------------------------------------------------------
router.put('/:id', async (req, res) => {
    const allowed = ['name', 'age', 'gender', 'dangerLevel', 'lastKnownAddress', 'warrantStatus', 'isActive'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const criminal = await Criminal.findByIdAndUpdate(req.params.id, updates, { new: true })
        .select('-faceEmbedding');
    if (!criminal) return res.status(404).json({ success: false, message: 'Not found' });

    res.json({ success: true, criminal });
});

// ---------------------------------------------------------------------------
// PUT /portal/criminals/:id/photo  — update photo + regenerate face embedding
// ---------------------------------------------------------------------------
router.put('/:id/photo', upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'photo file required' });

    const photoUrl  = await savePhoto(req.file.buffer, req.file.originalname);
    const embedding = await extractEmbedding(req.file.buffer, req.file.originalname, req.file.mimetype);

    const criminal = await Criminal.findByIdAndUpdate(
        req.params.id,
        { photo: photoUrl, faceEmbedding: embedding || [], hasEmbedding: !!embedding },
        { new: true }
    ).select('-faceEmbedding');

    if (!criminal) return res.status(404).json({ success: false, message: 'Not found' });

    res.json({
        success: true,
        criminal,
        embeddingGenerated: !!embedding,
        message: embedding ? 'Photo updated and face indexed for recognition' : 'Photo updated (no face detected — recognition will not work)',
    });
});

// ---------------------------------------------------------------------------
// POST /portal/criminals/:id/reindex  — regenerate embedding from stored photo
// ---------------------------------------------------------------------------
router.post('/:id/reindex', async (req, res) => {
    const criminal = await Criminal.findById(req.params.id);
    if (!criminal) return res.status(404).json({ success: false, message: 'Not found' });
    if (!criminal.photo) return res.status(400).json({ success: false, message: 'No photo on file to index' });

    // Resolve photo path on disk
    const photoPath = path.join(__dirname, '../../../', criminal.photo);
    if (!fs.existsSync(photoPath)) {
        return res.status(400).json({ success: false, message: 'Photo file not found on disk' });
    }

    const buffer   = fs.readFileSync(photoPath);
    const filename = path.basename(photoPath);
    const mimeType = /\.png$/i.test(filename) ? 'image/png' : 'image/jpeg';
    const embedding = await extractEmbedding(buffer, filename, mimeType);

    await Criminal.findByIdAndUpdate(req.params.id, {
        faceEmbedding: embedding || [],
        hasEmbedding: !!embedding,
    });

    const updated = await Criminal.findById(req.params.id).select('-faceEmbedding');
    res.json({
        success: true,
        criminal: updated,
        embeddingGenerated: !!embedding,
        message: embedding ? 'Face re-indexed successfully' : 'No face detected in stored photo',
    });
});

// ---------------------------------------------------------------------------
// POST /portal/criminals/:id/history  — add offense to history
// ---------------------------------------------------------------------------
router.post('/:id/history', async (req, res) => {
    const { offense, caseId } = req.body;
    if (!offense) return res.status(400).json({ success: false, message: 'offense required' });

    const criminal = await Criminal.findByIdAndUpdate(
        req.params.id,
        { $push: { crimeHistory: { offense, caseId, date: new Date() } } },
        { new: true }
    ).select('-faceEmbedding');

    if (!criminal) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, criminal });
});

module.exports = router;
