// =============================================================================
// controllers/ai.controller.js - AI Microservice Proxy Controller
// Routes requests to FastAPI Python AI services and returns results
// =============================================================================

'use strict';

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const Criminal = require('../models/Criminal.model');
const Hotspot = require('../models/Hotspot.model');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:8000';

/**
 * Helper: Forward multipart image to Python AI service
 */
async function forwardImageToAI(endpoint, fileBuffer, filename, mimeType) {
    const formData = new FormData();
    formData.append('file', fileBuffer, {
        filename: filename || 'image.jpg',
        contentType: mimeType || 'image/jpeg'
    });

    const response = await axios.post(`${AI_SERVICE_URL}${endpoint}`, formData, {
        headers: {
            ...formData.getHeaders(),
            'X-API-Key': process.env.AI_SERVICE_API_KEY || ''
        },
        timeout: 30000    // 30 seconds (AI inference can be slow)
    });

    return response.data;
}

/**
 * POST /api/ai/face-recognition
 * Proxies face image to AI service for criminal identification
 */
const recognizeFace = async (req, res) => {
    if (!req.file) {
        throw new AppError('Image file is required', 400);
    }

    const aiResult = await forwardImageToAI(
        '/ai/face-recognition',
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
    );

    logger.info(`Face recognition: match=${aiResult.match}, confidence=${aiResult.confidence}`);

    res.status(200).json({
        success: true,
        ...aiResult
    });
};

/**
 * POST /api/ai/anpr
 * Automatic Number Plate Recognition - returns plate number + vehicle info
 */
const detectNumberPlate = async (req, res) => {
    if (!req.file) {
        throw new AppError('Image file is required', 400);
    }

    const aiResult = await forwardImageToAI(
        '/ai/anpr',
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
    );

    // If plate detected, lookup in vehicle database
    let vehicleInfo = null;
    if (aiResult.plateNumber) {
        const Vehicle = require('../models/Vehicle.model');
        vehicleInfo = await Vehicle
            .findOne({ plateNumber: aiResult.plateNumber.toUpperCase() })
            .catch(() => null);
    }

    res.status(200).json({
        success: true,
        plateNumber: aiResult.plateNumber,
        confidence: aiResult.confidence,
        vehicle: vehicleInfo
    });
};

/**
 * POST /api/ai/detect-weapon
 * Weapon detection from camera frame using YOLOv8
 */
const detectWeapon = async (req, res) => {
    if (!req.file) {
        throw new AppError('Image file is required', 400);
    }

    const aiResult = await forwardImageToAI(
        '/ai/detect-weapon',
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
    );

    // If weapon detected, create an automatic alert
    if (aiResult.weaponDetected) {
        const io = req.app.get('io');
        if (io) {
            io.to('police_room').emit('weapon_detected', {
                detectedBy: req.user._id,
                officerName: req.user.name,
                weapons: aiResult.detections?.map(d => d.label),
                timestamp: new Date().toISOString()
            });
        }

        logger.warn(`⚠️ WEAPON DETECTED by ${req.user.email}: ${JSON.stringify(aiResult.detections)}`);
    }

    res.status(200).json({
        success: true,
        ...aiResult
    });
};

/**
 * POST /api/ai/classify-complaint
 * NLP BERT classification of complaint text
 */
const classifyComplaint = async (req, res) => {
    const { text } = req.body;

    if (!text || text.trim().length < 10) {
        throw new AppError('Please provide a complaint text (minimum 10 characters)', 400);
    }

    const response = await axios.post(
        `${AI_SERVICE_URL}/ai/classify-complaint`,
        { text: text.trim() },
        {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
        }
    );

    res.status(200).json({
        success: true,
        ...response.data
    });
};

/**
 * GET /api/ai/hotspots
 * Get crime hotspot clusters (cached from scheduled AI job)
 */
const getCrimeHotspots = async (req, res) => {
    // Always try to get fresh data from AI service
    let hotspots;

    try {
        const response = await axios.get(`${AI_SERVICE_URL}/ai/hotspots`, {
            timeout: 10000
        });
        hotspots = response.data.hotspots;
    } catch (aiError) {
        logger.warn('AI service unavailable for hotspots. Using cached data.');
        // Fallback to cached MongoDB hotspots
        const mongoose = require('mongoose');
        const HotspotModel = mongoose.model('Hotspot');
        const dbHotspots = await HotspotModel.find({}).sort({ riskScore: -1 }).limit(50);
        hotspots = dbHotspots.map(h => ({
            latitude: h.location.coordinates[1],
            longitude: h.location.coordinates[0],
            riskScore: h.riskScore,
            crimeCount: h.crimeCount,
            area: h.area
        }));
    }

    res.status(200).json({
        success: true,
        hotspots: hotspots || []
    });
};

/**
 * POST /api/ai/chat
 * AI Chatbot for emergency guidance
 */
const chat = async (req, res) => {
    const { message, sessionId } = req.body;

    if (!message || message.trim().length === 0) {
        throw new AppError('Message is required', 400);
    }

    const response = await axios.post(
        `${AI_SERVICE_URL}/ai/chat`,
        { message: message.trim(), sessionId: sessionId || 'default' },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    res.status(200).json({
        success: true,
        response: response.data.response,
        sessionId: response.data.sessionId || sessionId
    });
};

module.exports = { recognizeFace, detectNumberPlate, detectWeapon, classifyComplaint, getCrimeHotspots, chat };
