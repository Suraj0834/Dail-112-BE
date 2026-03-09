'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const Criminal = mongoose.model('Criminal');

const router = express.Router();

// All criminal routes require police/admin authentication
router.use(authenticate, authorize('police', 'admin'));

/**
 * GET /api/criminals
 * Search criminals by name (paginated)
 */
router.get('/', async (req, res) => {
    const { page = 1, limit = 15, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const query = search ? { name: { $regex: search, $options: 'i' } } : {};

    const [criminals, total] = await Promise.all([
        Criminal.find(query)
            .select('-faceEmbedding')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Criminal.countDocuments(query),
    ]);

    res.json({
        success: true,
        criminals,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
    });
});

/**
 * GET /api/criminals/:id
 * Get a single criminal by ID (for detail view after face recognition match)
 */
router.get('/:id', async (req, res) => {
    const criminal = await Criminal.findById(req.params.id).select('-faceEmbedding');
    if (!criminal) {
        return res.status(404).json({ success: false, message: 'Criminal record not found' });
    }
    res.json({ success: true, criminal });
});

module.exports = router;
