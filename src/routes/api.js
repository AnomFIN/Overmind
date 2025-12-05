/**
 * API Routes for AnomHome Overmind
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import fs from 'fs/promises';

import storage from '../storage.js';
import { chatWithAI } from '../services/openai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
const upload = multer({
    storage: multer.diskStorage({
        destination: uploadDir,
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname);
            const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
            cb(null, `${nanoid(10)}_${safeName}`);
        }
    }),
    limits: {
        fileSize: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '50') * 1024 * 1024
    }
});

// ============================================
// Configuration endpoint
// ============================================
router.get('/config', (req, res) => {
    res.json({
        features: {
            openai: process.env.ENABLE_OPENAI !== 'false',
            links: process.env.ENABLE_LINKS !== 'false',
            uploads: process.env.ENABLE_UPLOADS !== 'false',
            files: process.env.ENABLE_FILES !== 'false',
            cameras: process.env.ENABLE_CAMERAS !== 'false',
            notes: process.env.ENABLE_NOTES !== 'false'
        },
        openai: {
            configured: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
        },
        baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
    });
});

// ============================================
// OpenAI Console
// ============================================
router.post('/chat', async (req, res) => {
    if (process.env.ENABLE_OPENAI === 'false') {
        return res.status(403).json({ error: 'OpenAI console is disabled' });
    }
    
    try {
        const { message, history = [] } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        const response = await chatWithAI(message, history);
        res.json(response);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to process chat request'
        });
    }
});

router.get('/chat/history', async (req, res) => {
    try {
        const history = await storage.read('chat_history');
        res.json(history);
    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: 'Failed to get chat history' });
    }
});

router.delete('/chat/history', async (req, res) => {
    try {
        await storage.write('chat_history', []);
        res.json({ success: true });
    } catch (error) {
        console.error('Clear chat history error:', error);
        res.status(500).json({ error: 'Failed to clear chat history' });
    }
});

// ============================================
// Link Shortener
// ============================================
router.get('/links', async (req, res) => {
    if (process.env.ENABLE_LINKS === 'false') {
        return res.status(403).json({ error: 'Link shortener is disabled' });
    }
    
    try {
        const links = await storage.read('links');
        res.json(links);
    } catch (error) {
        console.error('Get links error:', error);
        res.status(500).json({ error: 'Failed to get links' });
    }
});

router.post('/links', async (req, res) => {
    if (process.env.ENABLE_LINKS === 'false') {
        return res.status(403).json({ error: 'Link shortener is disabled' });
    }
    
    try {
        const { url, custom_code, expires_in_hours } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        // Validate URL
        try {
            new URL(url);
        } catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        
        const code = custom_code || nanoid(6);
        
        // Check if code already exists
        const existing = await storage.findOne('links', 'code', code);
        if (existing) {
            return res.status(409).json({ error: 'Code already exists' });
        }
        
        const link = {
            id: nanoid(),
            code,
            url,
            created_at: new Date().toISOString(),
            expires_at: expires_in_hours ? new Date(Date.now() + expires_in_hours * 3600000).toISOString() : null,
            hits: 0,
            last_hit: null
        };
        
        await storage.insert('links', link);
        
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        res.json({
            ...link,
            short_url: `${baseUrl}/r/${code}`
        });
    } catch (error) {
        console.error('Create link error:', error);
        res.status(500).json({ error: 'Failed to create link' });
    }
});

router.delete('/links/:code', async (req, res) => {
    if (process.env.ENABLE_LINKS === 'false') {
        return res.status(403).json({ error: 'Link shortener is disabled' });
    }
    
    try {
        const deleted = await storage.remove('links', 'code', req.params.code);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Link not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete link error:', error);
        res.status(500).json({ error: 'Failed to delete link' });
    }
});

// ============================================
// Temp Uploads
// ============================================
router.get('/uploads', async (req, res) => {
    if (process.env.ENABLE_UPLOADS === 'false') {
        return res.status(403).json({ error: 'Uploads are disabled' });
    }
    
    try {
        const uploads = await storage.read('uploads');
        // Filter out expired uploads
        const now = new Date();
        const active = uploads.filter(u => new Date(u.expires_at) > now);
        res.json(active);
    } catch (error) {
        console.error('Get uploads error:', error);
        res.status(500).json({ error: 'Failed to get uploads' });
    }
});

router.post('/uploads', upload.single('file'), async (req, res) => {
    if (process.env.ENABLE_UPLOADS === 'false') {
        return res.status(403).json({ error: 'Uploads are disabled' });
    }
    
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const ttlMinutes = parseInt(process.env.UPLOAD_TTL_MINUTES || '15');
        
        const upload = {
            id: nanoid(),
            filename: req.file.filename,
            original_name: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + ttlMinutes * 60000).toISOString()
        };
        
        await storage.insert('uploads', upload);
        
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        res.json({
            ...upload,
            download_url: `${baseUrl}/uploads/${upload.filename}`
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

router.delete('/uploads/:id', async (req, res) => {
    if (process.env.ENABLE_UPLOADS === 'false') {
        return res.status(403).json({ error: 'Uploads are disabled' });
    }
    
    try {
        const upload = await storage.findOne('uploads', 'id', req.params.id);
        
        if (!upload) {
            return res.status(404).json({ error: 'Upload not found' });
        }
        
        // Delete the file
        const filePath = path.join(uploadDir, upload.filename);
        try {
            await fs.unlink(filePath);
        } catch (err) {
            console.warn('Failed to delete file:', err.message);
        }
        
        // Remove from storage
        await storage.remove('uploads', 'id', req.params.id);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete upload error:', error);
        res.status(500).json({ error: 'Failed to delete upload' });
    }
});

// ============================================
// File Browser
// ============================================
router.get('/files', async (req, res) => {
    if (process.env.ENABLE_FILES === 'false') {
        return res.status(403).json({ error: 'File browser is disabled' });
    }
    
    try {
        const basePath = process.env.HOME_STORAGE_PATH || './uploads';
        const requestedPath = req.query.path || '';
        
        // Resolve and validate path
        const fullPath = path.resolve(basePath, requestedPath);
        const resolvedBase = path.resolve(basePath);
        
        // Prevent directory traversal
        if (!fullPath.startsWith(resolvedBase)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const stat = await fs.stat(fullPath);
        
        if (!stat.isDirectory()) {
            return res.status(400).json({ error: 'Path is not a directory' });
        }
        
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        
        const items = await Promise.all(entries.map(async (entry) => {
            const itemPath = path.join(fullPath, entry.name);
            try {
                const itemStat = await fs.stat(itemPath);
                return {
                    name: entry.name,
                    type: entry.isDirectory() ? 'directory' : 'file',
                    size: entry.isFile() ? itemStat.size : null,
                    modified: itemStat.mtime.toISOString()
                };
            } catch {
                return {
                    name: entry.name,
                    type: entry.isDirectory() ? 'directory' : 'file',
                    size: null,
                    modified: null
                };
            }
        }));
        
        res.json({
            path: requestedPath || '/',
            items: items.sort((a, b) => {
                // Directories first, then alphabetically
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
            })
        });
    } catch (error) {
        console.error('File browser error:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Directory not found' });
        }
        res.status(500).json({ error: 'Failed to browse files' });
    }
});

router.get('/files/download', async (req, res) => {
    if (process.env.ENABLE_FILES === 'false') {
        return res.status(403).json({ error: 'File browser is disabled' });
    }
    
    try {
        const basePath = process.env.HOME_STORAGE_PATH || './uploads';
        const requestedPath = req.query.path;
        
        if (!requestedPath) {
            return res.status(400).json({ error: 'Path is required' });
        }
        
        // Resolve and validate path
        const fullPath = path.resolve(basePath, requestedPath);
        const resolvedBase = path.resolve(basePath);
        
        // Prevent directory traversal
        if (!fullPath.startsWith(resolvedBase)) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const stat = await fs.stat(fullPath);
        
        if (!stat.isFile()) {
            return res.status(400).json({ error: 'Path is not a file' });
        }
        
        res.download(fullPath);
    } catch (error) {
        console.error('File download error:', error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'File not found' });
        }
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// ============================================
// Camera Wall
// ============================================
router.get('/cameras', async (req, res) => {
    if (process.env.ENABLE_CAMERAS === 'false') {
        return res.status(403).json({ error: 'Camera wall is disabled' });
    }
    
    try {
        const cameras = await storage.read('cameras');
        res.json(cameras);
    } catch (error) {
        console.error('Get cameras error:', error);
        res.status(500).json({ error: 'Failed to get cameras' });
    }
});

router.post('/cameras', async (req, res) => {
    if (process.env.ENABLE_CAMERAS === 'false') {
        return res.status(403).json({ error: 'Camera wall is disabled' });
    }
    
    try {
        const { name, url, type = 'http' } = req.body;
        
        if (!name || !url) {
            return res.status(400).json({ error: 'Name and URL are required' });
        }
        
        const camera = {
            id: nanoid(),
            name,
            url,
            type, // 'rtsp', 'http', 'hls'
            created_at: new Date().toISOString()
        };
        
        await storage.insert('cameras', camera);
        res.json(camera);
    } catch (error) {
        console.error('Add camera error:', error);
        res.status(500).json({ error: 'Failed to add camera' });
    }
});

router.put('/cameras/:id', async (req, res) => {
    if (process.env.ENABLE_CAMERAS === 'false') {
        return res.status(403).json({ error: 'Camera wall is disabled' });
    }
    
    try {
        const { name, url, type } = req.body;
        const updates = {};
        
        if (name) updates.name = name;
        if (url) updates.url = url;
        if (type) updates.type = type;
        
        const updated = await storage.update('cameras', 'id', req.params.id, updates);
        
        if (!updated) {
            return res.status(404).json({ error: 'Camera not found' });
        }
        
        res.json(updated);
    } catch (error) {
        console.error('Update camera error:', error);
        res.status(500).json({ error: 'Failed to update camera' });
    }
});

router.delete('/cameras/:id', async (req, res) => {
    if (process.env.ENABLE_CAMERAS === 'false') {
        return res.status(403).json({ error: 'Camera wall is disabled' });
    }
    
    try {
        const deleted = await storage.remove('cameras', 'id', req.params.id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Camera not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete camera error:', error);
        res.status(500).json({ error: 'Failed to delete camera' });
    }
});

// ============================================
// Mind-Map Notes
// ============================================
router.get('/notes', async (req, res) => {
    if (process.env.ENABLE_NOTES === 'false') {
        return res.status(403).json({ error: 'Notes board is disabled' });
    }
    
    try {
        const notes = await storage.read('notes');
        res.json(notes);
    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({ error: 'Failed to get notes' });
    }
});

router.post('/notes', async (req, res) => {
    if (process.env.ENABLE_NOTES === 'false') {
        return res.status(403).json({ error: 'Notes board is disabled' });
    }
    
    try {
        const { title, content, parent_id = null, tags = [], position = { x: 0, y: 0 } } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const note = {
            id: nanoid(),
            title,
            content: content || '',
            parent_id,
            tags,
            position,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        await storage.insert('notes', note);
        
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
        res.json({
            ...note,
            share_url: `${baseUrl}/?note=${note.id}`
        });
    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

router.put('/notes/:id', async (req, res) => {
    if (process.env.ENABLE_NOTES === 'false') {
        return res.status(403).json({ error: 'Notes board is disabled' });
    }
    
    try {
        const { title, content, parent_id, tags, position } = req.body;
        const updates = { updated_at: new Date().toISOString() };
        
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (parent_id !== undefined) updates.parent_id = parent_id;
        if (tags !== undefined) updates.tags = tags;
        if (position !== undefined) updates.position = position;
        
        const updated = await storage.update('notes', 'id', req.params.id, updates);
        
        if (!updated) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        res.json(updated);
    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

router.delete('/notes/:id', async (req, res) => {
    if (process.env.ENABLE_NOTES === 'false') {
        return res.status(403).json({ error: 'Notes board is disabled' });
    }
    
    try {
        const deleted = await storage.remove('notes', 'id', req.params.id);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

export default router;
