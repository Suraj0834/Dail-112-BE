// =============================================================================
// middleware/upload.middleware.js - Multer file upload configuration
// Uses Cloudinary in production, local disk in development
// =============================================================================

'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { AppError } = require('./errorHandler');

// ── Local disk storage (development only) ────────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folder = file.mimetype.startsWith('image/') ? 'images' : 'docs';
        const dest = path.join(uploadDir, folder);
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${req.user?.id || 'anon'}-${Date.now()}-${Math.round(Math.random() * 1E4)}`;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, uniqueName + ext);
    }
});

// ── Cloudinary storage (production) ──────────────────────────────────────────
let cloudinaryStorage = null;
if (process.env.CLOUDINARY_CLOUD_NAME) {
    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    const cloudinary = require('../config/cloudinary');
    cloudinaryStorage = new CloudinaryStorage({
        cloudinary,
        params: (req, file) => ({
            folder: 'dial112',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ quality: 'auto', fetch_format: 'auto' }]
        })
    });
}

// ── File filter (shared) ──────────────────────────────────────────────────────
const imageFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 400), false);
    }
};

// Image upload middleware — auto-selects Cloudinary in prod, disk locally
const uploadImage = multer({
    storage: cloudinaryStorage || diskStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFilter
});

// In-memory storage for AI processing (images sent directly to Python service)
const memoryStorage = multer.memoryStorage();

const uploadToMemory = multer({
    storage: memoryStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: imageFilter
});

module.exports = { uploadImage, uploadToMemory };
