'use strict';
// AnomFIN — the neural network of innovation.

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const db = require('../utils/database');

const CAMERAS_FILE = 'cameras.json';

function sanitizeCamera(payload) {
    const allowed = ['name', 'rtspUrl', 'enabled', 'sensitivity', 'minMotionSeconds', 'cooldownSeconds', 'outputDir', 'audio'];
    const result = {};
    for (const key of allowed) {
        if (payload[key] !== undefined) result[key] = payload[key];
    }
    return result;
}

router.get('/', async (req, res) => {
    try {
        const cameras = await db.readData(CAMERAS_FILE, []);
        const statuses = (req.app.locals.motionRecorder?.getStatuses?.() || []);
        const merged = cameras.map(cam => ({
            ...cam,
            status: statuses.find(s => s.id === cam.id) || null
        }));
        res.json(merged);
    } catch (err) {
        res.status(500).json({ error: 'Failed to list cameras' });
    }
});

router.post('/', async (req, res) => {
    try {
        const clean = sanitizeCamera(req.body);
        if (!clean.name || !clean.rtspUrl) {
            return res.status(400).json({ error: 'name and rtspUrl required' });
        }
        const id = uuidv4();
        const camera = {
            id,
            name: clean.name,
            rtspUrl: clean.rtspUrl,
            enabled: clean.enabled !== false,
            sensitivity: Number(clean.sensitivity) || 12,
            minMotionSeconds: Number(clean.minMotionSeconds) || 2,
            cooldownSeconds: Number(clean.cooldownSeconds) || 3,
            outputDir: clean.outputDir || path.join('recordings', id),
            audio: clean.audio === true,
            createdAt: new Date().toISOString()
        };
        const cameras = await db.readData(CAMERAS_FILE, []);
        cameras.push(camera);
        await db.writeData(CAMERAS_FILE, cameras);
        req.app.locals.motionRecorder?.refreshConfigs();
        res.status(201).json(camera);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add camera' });
    }
});

router.post('/:id/enable', async (req, res) => {
    try {
        const updated = await db.updateData(CAMERAS_FILE, req.params.id, { enabled: true });
        req.app.locals.motionRecorder?.refreshConfigs();
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to enable camera' });
    }
});

router.post('/:id/disable', async (req, res) => {
    try {
        const updated = await db.updateData(CAMERAS_FILE, req.params.id, { enabled: false });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to disable camera' });
    }
});

router.post('/:id/test', async (req, res) => {
    try {
        const clip = await req.app.locals.motionRecorder.runTest(req.params.id);
        res.json({ success: true, clip });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
