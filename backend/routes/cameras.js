/**
 * Camera Wall Route
 * Manage IP camera streams
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/database');

const CAMERAS_FILE = 'cameras.json';

/**
 * POST /api/cameras
 * Add a new camera
 */
router.post('/', async (req, res) => {
    try {
        const { name, url, type, username, password } = req.body;
        
        if (!name || !url) {
            return res.status(400).json({ error: 'Name and URL are required' });
        }
        
        const camera = {
            id: uuidv4(),
            name,
            url,
            type: type || 'mjpeg', // mjpeg, hls, rtsp-proxy
            username: username || null,
            password: password || null,
            enabled: true,
            createdAt: new Date().toISOString()
        };
        
        await db.appendData(CAMERAS_FILE, camera);
        
        // Don't send password in response
        const { password: _, ...safeCamera } = camera;
        res.status(201).json({ success: true, camera: safeCamera });
        
    } catch (err) {
        console.error('[Cameras] Create error:', err.message);
        res.status(500).json({ error: 'Failed to add camera' });
    }
});

/**
 * GET /api/cameras
 * List all cameras
 */
router.get('/', async (req, res) => {
    try {
        const cameras = await db.readData(CAMERAS_FILE);
        // Remove passwords from response
        const safeCameras = cameras.map(({ password, ...camera }) => camera);
        res.json(safeCameras);
    } catch (err) {
        console.error('[Cameras] List error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve cameras' });
    }
});

/**
 * GET /api/cameras/:id
 * Get a specific camera
 */
router.get('/:id', async (req, res) => {
    try {
        const camera = await db.findById(CAMERAS_FILE, req.params.id);
        if (!camera) {
            return res.status(404).json({ error: 'Camera not found' });
        }
        // Remove password from response
        const { password, ...safeCamera } = camera;
        res.json(safeCamera);
    } catch (err) {
        console.error('[Cameras] Get error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve camera' });
    }
});

/**
 * PUT /api/cameras/:id
 * Update a camera
 */
router.put('/:id', async (req, res) => {
    try {
        const { name, url, type, username, password, enabled } = req.body;
        
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (url !== undefined) updates.url = url;
        if (type !== undefined) updates.type = type;
        if (username !== undefined) updates.username = username;
        if (password !== undefined) updates.password = password;
        if (enabled !== undefined) updates.enabled = enabled;
        updates.updatedAt = new Date().toISOString();
        
        const camera = await db.updateData(CAMERAS_FILE, req.params.id, updates);
        
        if (!camera) {
            return res.status(404).json({ error: 'Camera not found' });
        }
        
        // Remove password from response
        const { password: _, ...safeCamera } = camera;
        res.json({ success: true, camera: safeCamera });
        
    } catch (err) {
        console.error('[Cameras] Update error:', err.message);
        res.status(500).json({ error: 'Failed to update camera' });
    }
});

/**
 * DELETE /api/cameras/:id
 * Delete a camera
 */
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await db.deleteData(CAMERAS_FILE, req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Camera not found' });
        }
        res.json({ success: true, message: 'Camera deleted' });
    } catch (err) {
        console.error('[Cameras] Delete error:', err.message);
        res.status(500).json({ error: 'Failed to delete camera' });
    }
});

/**
 * GET /api/cameras/:id/stream
 * Proxy camera stream (for cameras requiring auth)
 */
router.get('/:id/stream', async (req, res) => {
    try {
        const camera = await db.findById(CAMERAS_FILE, req.params.id);
        
        if (!camera) {
            return res.status(404).json({ error: 'Camera not found' });
        }
        
        if (!camera.enabled) {
            return res.status(403).json({ error: 'Camera is disabled' });
        }
        
        // For MJPEG streams, we can proxy directly
        // For other types, return the URL for client-side handling
        if (camera.type === 'mjpeg' && camera.username && camera.password) {
            // Proxy authenticated MJPEG stream
            const http = camera.url.startsWith('https') ? require('https') : require('http');
            const url = new URL(camera.url);
            
            const auth = Buffer.from(`${camera.username}:${camera.password}`).toString('base64');
            
            const proxyReq = http.request({
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${auth}`
                }
            }, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
            });
            
            proxyReq.on('error', (err) => {
                console.error('[Cameras] Stream proxy error:', err.message);
                if (!res.headersSent) {
                    res.status(502).json({ error: 'Failed to connect to camera' });
                }
            });
            
            req.on('close', () => {
                proxyReq.destroy();
            });
            
            proxyReq.end();
        } else {
            // Return URL for direct access
            res.json({ url: camera.url, type: camera.type });
        }
        
    } catch (err) {
        console.error('[Cameras] Stream error:', err.message);
        res.status(500).json({ error: 'Failed to get camera stream' });
    }
});

module.exports = router;
