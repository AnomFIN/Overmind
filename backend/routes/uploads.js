/**
 * Temporary File Uploads Route
 * 15-minute expiring file uploads
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { UPLOAD_DIR, getFileExpiration, ensureUploadDir } = require('../utils/cleanup');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        await ensureUploadDir();
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueId}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '100') * 1024 * 1024 // Default 100MB
    }
});

/**
 * POST /api/uploads
 * Upload a temporary file
 */
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Save metadata
        const metadata = {
            originalName: req.file.originalname,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedAt: new Date().toISOString()
        };
        
        await fs.writeFile(
            path.join(UPLOAD_DIR, `${req.file.filename}.meta.json`),
            JSON.stringify(metadata, null, 2)
        );
        
        const expiration = await getFileExpiration(req.file.filename);
        
        res.status(201).json({
            success: true,
            file: {
                id: path.basename(req.file.filename, path.extname(req.file.filename)),
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                downloadUrl: `/api/uploads/${req.file.filename}`,
                expiresAt: expiration?.toISOString()
            }
        });
        
    } catch (err) {
        console.error('[Uploads] Upload error:', err.message);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

/**
 * GET /api/uploads/:filename
 * Download a file
 */
router.get('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(UPLOAD_DIR, filename);
        
        // Prevent directory traversal
        if (!filepath.startsWith(UPLOAD_DIR)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({ error: 'File not found or expired' });
        }
        
        // Get metadata if available
        let originalName = filename;
        try {
            const metaPath = `${filepath}.meta.json`;
            const metaData = JSON.parse(await fs.readFile(metaPath, 'utf8'));
            originalName = metaData.originalName || filename;
        } catch {
            // Metadata not available
        }
        
        res.download(filepath, originalName);
        
    } catch (err) {
        console.error('[Uploads] Download error:', err.message);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

/**
 * GET /api/uploads/:filename/info
 * Get file information
 */
router.get('/:filename/info', async (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(UPLOAD_DIR, filename);
        
        // Prevent directory traversal
        if (!filepath.startsWith(UPLOAD_DIR)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({ error: 'File not found or expired' });
        }
        
        const stats = await fs.stat(filepath);
        const expiration = await getFileExpiration(filename);
        
        // Get metadata if available
        let metadata = {};
        try {
            const metaPath = `${filepath}.meta.json`;
            metadata = JSON.parse(await fs.readFile(metaPath, 'utf8'));
        } catch {
            // Metadata not available
        }
        
        res.json({
            filename,
            originalName: metadata.originalName || filename,
            size: stats.size,
            mimetype: metadata.mimetype || 'application/octet-stream',
            uploadedAt: metadata.uploadedAt || stats.mtime.toISOString(),
            expiresAt: expiration?.toISOString(),
            remainingMs: expiration ? expiration.getTime() - Date.now() : null
        });
        
    } catch (err) {
        console.error('[Uploads] Info error:', err.message);
        res.status(500).json({ error: 'Failed to get file info' });
    }
});

/**
 * DELETE /api/uploads/:filename
 * Delete a file early
 */
router.delete('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const filepath = path.join(UPLOAD_DIR, filename);
        
        // Prevent directory traversal
        if (!filepath.startsWith(UPLOAD_DIR)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        try {
            await fs.unlink(filepath);
            // Also delete metadata
            try {
                await fs.unlink(`${filepath}.meta.json`);
            } catch {
                // Metadata might not exist
            }
            res.json({ success: true, message: 'File deleted' });
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).json({ error: 'File not found' });
            }
            throw err;
        }
        
    } catch (err) {
        console.error('[Uploads] Delete error:', err.message);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

module.exports = router;
