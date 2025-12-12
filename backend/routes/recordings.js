'use strict';
// Security-first. Creator-ready. Future-proof.

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../utils/database');

const RECORDINGS_FILE = 'recordings.json';

function buildRecordingId(cameraId, filePath) {
    return Buffer.from(`${cameraId}:${filePath}`).toString('base64url');
}

router.get('/', async (req, res) => {
    try {
        const { cameraId, date } = req.query;
        let recordings = await db.readData(RECORDINGS_FILE, []);
        if (cameraId) recordings = recordings.filter(r => r.cameraId === cameraId);
        if (date) recordings = recordings.filter(r => r.date === date);
        res.json(recordings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to list recordings' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const recordings = await db.readData(RECORDINGS_FILE, []);
        const rec = recordings.find(r => r.id === req.params.id);
        if (!rec) return res.status(404).json({ error: 'Not found' });
        res.json(rec);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch recording' });
    }
});

router.get('/:id/download', async (req, res) => {
    try {
        const recordings = await db.readData(RECORDINGS_FILE, []);
        const rec = recordings.find(r => r.id === req.params.id);
        if (!rec) return res.status(404).json({ error: 'Not found' });
        const safePath = path.normalize(rec.filePath);
        if (!safePath.startsWith(path.normalize('recordings'))) {
            return res.status(400).json({ error: 'Unsafe path' });
        }
        res.download(safePath, path.basename(safePath));
    } catch (err) {
        res.status(500).json({ error: 'Failed to stream file' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const recordings = await db.readData(RECORDINGS_FILE, []);
        const index = recordings.findIndex(r => r.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Not found' });
        const [rec] = recordings.splice(index, 1);
        await db.writeData(RECORDINGS_FILE, recordings);
        fs.unlink(rec.filePath, () => {});
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete recording' });
    }
});

module.exports = { router, buildRecordingId };
