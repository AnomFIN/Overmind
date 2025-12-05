/**
 * AnomHome Overmind - Server Entry Point
 * A self-hosted home dashboard for Linux
 */

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const LINKS_FILE = path.join(DATA_DIR, 'links.json');
const UPLOADS_FILE = path.join(DATA_DIR, 'uploads.json');
const CAMERAS_FILE = path.join(DATA_DIR, 'cameras.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');

// Upload directory (configurable via env)
const UPLOADS_DIR = process.env.TEMP_UPLOAD_DIR 
    ? path.resolve(__dirname, process.env.TEMP_UPLOAD_DIR)
    : path.join(__dirname, 'tmp_uploads');

// Home storage path for file browser
const HOME_STORAGE_PATH = process.env.HOME_STORAGE_PATH || null;

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Serve uploads
app.use('/uploads', express.static(UPLOADS_DIR));

// Utility functions for JSON persistence
function readJSON(filepath) {
    try {
        if (fs.existsSync(filepath)) {
            return JSON.parse(fs.readFileSync(filepath, 'utf8'));
        }
    } catch (err) {
        console.error(`Error reading ${filepath}:`, err.message);
    }
    return null;
}

function writeJSON(filepath, data) {
    try {
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error(`Error writing ${filepath}:`, err.message);
        return false;
    }
}

// Initialize data files if they don't exist
if (!fs.existsSync(LINKS_FILE)) writeJSON(LINKS_FILE, { links: {} });
if (!fs.existsSync(UPLOADS_FILE)) writeJSON(UPLOADS_FILE, { uploads: [] });
if (!fs.existsSync(CAMERAS_FILE)) writeJSON(CAMERAS_FILE, { cameras: [] });
if (!fs.existsSync(NOTES_FILE)) writeJSON(NOTES_FILE, { notes: [] });

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueId = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueId}${ext}`);
    }
});

const maxFileSize = (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024;
const upload = multer({
    storage: storage,
    limits: { fileSize: maxFileSize }
});

// ============================================
// Routes
// ============================================

// Serve main GUI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'GUI.html'));
});

// ============================================
// OpenAI Chat Console API
// ============================================
app.post('/api/chat', async (req, res) => {
    const { message, model = 'gpt-3.5-turbo' } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
        return res.status(500).json({ 
            error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file.' 
        });
    }

    try {
        const requestData = JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: message }],
            max_tokens: 1000
        });

        const options = {
            hostname: 'api.openai.com',
            port: 443,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Content-Length': Buffer.byteLength(requestData)
            }
        };

        const apiResponse = await new Promise((resolve, reject) => {
            const apiReq = https.request(options, (apiRes) => {
                let data = '';
                apiRes.on('data', chunk => data += chunk);
                apiRes.on('end', () => {
                    try {
                        resolve({ statusCode: apiRes.statusCode, data: JSON.parse(data) });
                    } catch (e) {
                        reject(new Error('Failed to parse OpenAI response'));
                    }
                });
            });
            apiReq.on('error', reject);
            apiReq.write(requestData);
            apiReq.end();
        });

        if (apiResponse.statusCode !== 200) {
            return res.status(apiResponse.statusCode).json({ 
                error: apiResponse.data.error?.message || 'OpenAI API error' 
            });
        }

        const reply = apiResponse.data.choices?.[0]?.message?.content || 'No response generated';
        res.json({ reply, model });
    } catch (err) {
        console.error('OpenAI API error:', err.message);
        res.status(500).json({ error: 'Failed to communicate with OpenAI API' });
    }
});

// ============================================
// Link Shortener API
// ============================================

// Create short link
app.post('/api/links', (req, res) => {
    const { url, customSlug } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
        new URL(url);
    } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    const data = readJSON(LINKS_FILE) || { links: {} };
    
    // Generate or use custom slug
    let slug = customSlug;
    if (!slug) {
        slug = uuidv4().substring(0, 8);
    }

    // Check if slug already exists
    if (data.links[slug]) {
        return res.status(409).json({ error: 'Slug already exists' });
    }

    data.links[slug] = {
        url: url,
        createdAt: new Date().toISOString(),
        clicks: 0
    };

    if (!writeJSON(LINKS_FILE, data)) {
        return res.status(500).json({ error: 'Failed to save link' });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    res.status(201).json({
        slug: slug,
        shortUrl: `${baseUrl}/s/${slug}`,
        originalUrl: url
    });
});

// Get all links
app.get('/api/links', (req, res) => {
    const data = readJSON(LINKS_FILE) || { links: {} };
    res.json(data.links);
});

// Delete a link
app.delete('/api/links/:slug', (req, res) => {
    const { slug } = req.params;
    const data = readJSON(LINKS_FILE) || { links: {} };
    
    if (!data.links[slug]) {
        return res.status(404).json({ error: 'Link not found' });
    }

    delete data.links[slug];
    
    if (!writeJSON(LINKS_FILE, data)) {
        return res.status(500).json({ error: 'Failed to delete link' });
    }

    res.json({ message: 'Link deleted successfully' });
});

// Redirect short link
app.get('/s/:slug', (req, res) => {
    const { slug } = req.params;
    const data = readJSON(LINKS_FILE) || { links: {} };
    
    if (!data.links[slug]) {
        return res.status(404).send('Link not found');
    }

    // Increment click counter
    data.links[slug].clicks++;
    writeJSON(LINKS_FILE, data);

    res.redirect(301, data.links[slug].url);
});

// ============================================
// Temporary File Upload API
// ============================================

// Upload file
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const data = readJSON(UPLOADS_FILE) || { uploads: [] };
    const cleanupMinutes = parseInt(process.env.UPLOAD_CLEANUP_MINUTES) || 15;
    
    const uploadInfo = {
        id: path.basename(req.file.filename, path.extname(req.file.filename)),
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + cleanupMinutes * 60 * 1000).toISOString()
    };

    data.uploads.push(uploadInfo);
    
    if (!writeJSON(UPLOADS_FILE, data)) {
        // Clean up uploaded file on save failure
        try {
            await fs.promises.unlink(req.file.path);
        } catch (err) {
            console.error('Error cleaning up file:', err.message);
        }
        return res.status(500).json({ error: 'Failed to save upload info' });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    res.status(201).json({
        id: uploadInfo.id,
        downloadUrl: `${baseUrl}/uploads/${uploadInfo.filename}`,
        originalName: uploadInfo.originalName,
        size: uploadInfo.size,
        expiresAt: uploadInfo.expiresAt
    });
});

// Get all uploads
app.get('/api/uploads', (req, res) => {
    const data = readJSON(UPLOADS_FILE) || { uploads: [] };
    res.json(data.uploads);
});

// Delete an upload
app.delete('/api/uploads/:id', async (req, res) => {
    const { id } = req.params;
    const data = readJSON(UPLOADS_FILE) || { uploads: [] };
    
    const uploadIndex = data.uploads.findIndex(u => u.id === id);
    if (uploadIndex === -1) {
        return res.status(404).json({ error: 'Upload not found' });
    }

    const upload = data.uploads[uploadIndex];
    const filepath = path.join(UPLOADS_DIR, upload.filename);
    
    // Remove file from disk asynchronously
    try {
        if (fs.existsSync(filepath)) {
            await fs.promises.unlink(filepath);
        }
    } catch (err) {
        console.error('Error deleting file:', err.message);
    }

    // Remove from data
    data.uploads.splice(uploadIndex, 1);
    
    if (!writeJSON(UPLOADS_FILE, data)) {
        return res.status(500).json({ error: 'Failed to update uploads data' });
    }

    res.json({ message: 'Upload deleted successfully' });
});

// Cleanup expired uploads
async function cleanupExpiredUploads() {
    const data = readJSON(UPLOADS_FILE) || { uploads: [] };
    const now = new Date();
    let cleaned = 0;

    const filteredUploads = [];
    for (const upload of data.uploads) {
        if (new Date(upload.expiresAt) <= now) {
            const filepath = path.join(UPLOADS_DIR, upload.filename);
            try {
                if (fs.existsSync(filepath)) {
                    await fs.promises.unlink(filepath);
                }
            } catch (err) {
                console.error('Error cleaning up file:', err.message);
            }
            cleaned++;
        } else {
            filteredUploads.push(upload);
        }
    }
    
    data.uploads = filteredUploads;

    if (cleaned > 0) {
        writeJSON(UPLOADS_FILE, data);
        console.log(`Cleaned up ${cleaned} expired uploads`);
    }
}

// Run cleanup every 5 minutes for 15-minute TTL files
setInterval(cleanupExpiredUploads, 5 * 60 * 1000);

// ============================================
// Local File Browser API
// ============================================

// Helper function to prevent directory traversal
function isPathSafe(basePath, requestedPath) {
    const resolvedPath = path.resolve(basePath, requestedPath);
    return resolvedPath.startsWith(path.resolve(basePath));
}

// List files in directory
app.get('/api/files', (req, res) => {
    if (!HOME_STORAGE_PATH) {
        return res.status(503).json({ 
            error: 'File browser not configured. Set HOME_STORAGE_PATH in .env' 
        });
    }

    if (!fs.existsSync(HOME_STORAGE_PATH)) {
        return res.status(503).json({ 
            error: 'Configured storage path does not exist' 
        });
    }

    const relativePath = req.query.path || '';
    
    // Security check - prevent directory traversal
    if (!isPathSafe(HOME_STORAGE_PATH, relativePath)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const fullPath = path.join(HOME_STORAGE_PATH, relativePath);

    try {
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'Path not found' });
        }

        const stats = fs.statSync(fullPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Path is not a directory' });
        }

        const entries = fs.readdirSync(fullPath, { withFileTypes: true });
        const files = entries.map(entry => {
            const entryPath = path.join(fullPath, entry.name);
            let entryStats;
            try {
                entryStats = fs.statSync(entryPath);
            } catch {
                return null;
            }
            
            return {
                name: entry.name,
                isDirectory: entry.isDirectory(),
                size: entry.isDirectory() ? null : entryStats.size,
                modifiedAt: entryStats.mtime.toISOString()
            };
        }).filter(Boolean);

        res.json({
            path: relativePath,
            files: files.sort((a, b) => {
                // Directories first, then alphabetical
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            })
        });
    } catch (err) {
        console.error('File browser error:', err.message);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Download file
app.get('/api/files/download', (req, res) => {
    if (!HOME_STORAGE_PATH) {
        return res.status(503).json({ error: 'File browser not configured' });
    }

    const relativePath = req.query.path;
    if (!relativePath) {
        return res.status(400).json({ error: 'Path is required' });
    }

    if (!isPathSafe(HOME_STORAGE_PATH, relativePath)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    const fullPath = path.join(HOME_STORAGE_PATH, relativePath);

    try {
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            return res.status(400).json({ error: 'Cannot download directories' });
        }

        res.download(fullPath);
    } catch (err) {
        console.error('File download error:', err.message);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

// ============================================
// Camera Wall API
// ============================================

// Get all cameras
app.get('/api/cameras', (req, res) => {
    const data = readJSON(CAMERAS_FILE) || { cameras: [] };
    res.json(data.cameras);
});

// Add camera
app.post('/api/cameras', (req, res) => {
    const { name, url, type = 'http' } = req.body;
    
    if (!name || !url) {
        return res.status(400).json({ error: 'Name and URL are required' });
    }

    const data = readJSON(CAMERAS_FILE) || { cameras: [] };
    
    const camera = {
        id: uuidv4(),
        name: name,
        url: url,
        type: type, // 'http', 'rtsp', 'mjpeg'
        createdAt: new Date().toISOString()
    };

    data.cameras.push(camera);
    
    if (!writeJSON(CAMERAS_FILE, data)) {
        return res.status(500).json({ error: 'Failed to save camera' });
    }

    res.status(201).json(camera);
});

// Delete camera
app.delete('/api/cameras/:id', (req, res) => {
    const { id } = req.params;
    const data = readJSON(CAMERAS_FILE) || { cameras: [] };
    
    const index = data.cameras.findIndex(c => c.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Camera not found' });
    }

    data.cameras.splice(index, 1);
    
    if (!writeJSON(CAMERAS_FILE, data)) {
        return res.status(500).json({ error: 'Failed to delete camera' });
    }

    res.json({ message: 'Camera deleted successfully' });
});

// ============================================
// Mind-Map Notes API
// ============================================

// Get all notes
app.get('/api/notes', (req, res) => {
    const data = readJSON(NOTES_FILE) || { notes: [] };
    res.json(data.notes);
});

// Get single note by ID
app.get('/api/notes/:id', (req, res) => {
    const { id } = req.params;
    const data = readJSON(NOTES_FILE) || { notes: [] };
    
    const note = data.notes.find(n => n.id === id);
    if (!note) {
        return res.status(404).json({ error: 'Note not found' });
    }

    res.json(note);
});

// Create note
app.post('/api/notes', (req, res) => {
    const { title, content, x = 0, y = 0, color = '#58a6ff', connections = [] } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const data = readJSON(NOTES_FILE) || { notes: [] };
    
    const note = {
        id: uuidv4(),
        title: title,
        content: content || '',
        x: x,
        y: y,
        color: color,
        connections: connections,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    data.notes.push(note);
    
    if (!writeJSON(NOTES_FILE, data)) {
        return res.status(500).json({ error: 'Failed to save note' });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    res.status(201).json({
        ...note,
        shareUrl: `${baseUrl}/note/${note.id}`
    });
});

// Update note
app.put('/api/notes/:id', (req, res) => {
    const { id } = req.params;
    const { title, content, x, y, color, connections } = req.body;
    
    const data = readJSON(NOTES_FILE) || { notes: [] };
    
    const index = data.notes.findIndex(n => n.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Note not found' });
    }

    // Update only provided fields
    if (title !== undefined) data.notes[index].title = title;
    if (content !== undefined) data.notes[index].content = content;
    if (x !== undefined) data.notes[index].x = x;
    if (y !== undefined) data.notes[index].y = y;
    if (color !== undefined) data.notes[index].color = color;
    if (connections !== undefined) data.notes[index].connections = connections;
    data.notes[index].updatedAt = new Date().toISOString();
    
    if (!writeJSON(NOTES_FILE, data)) {
        return res.status(500).json({ error: 'Failed to update note' });
    }

    res.json(data.notes[index]);
});

// Delete note
app.delete('/api/notes/:id', (req, res) => {
    const { id } = req.params;
    const data = readJSON(NOTES_FILE) || { notes: [] };
    
    const index = data.notes.findIndex(n => n.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Note not found' });
    }

    // Remove this note from any connections
    data.notes.forEach(note => {
        note.connections = note.connections.filter(connId => connId !== id);
    });

    data.notes.splice(index, 1);
    
    if (!writeJSON(NOTES_FILE, data)) {
        return res.status(500).json({ error: 'Failed to delete note' });
    }

    res.json({ message: 'Note deleted successfully' });
});

// Shareable note page route
app.get('/note/:id', (req, res) => {
    const { id } = req.params;
    const data = readJSON(NOTES_FILE) || { notes: [] };
    
    const note = data.notes.find(n => n.id === id);
    if (!note) {
        return res.status(404).send('Note not found');
    }

    // Serve the main GUI with note context
    res.sendFile(path.join(__dirname, 'public', 'GUI.html'));
});

// ============================================
// Error Handling
// ============================================
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ 
                error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 50}MB` 
            });
        }
    }
    
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║           AnomHome Overmind Dashboard                  ║
║                                                        ║
║  Server running at http://${HOST}:${PORT.toString().padEnd(4)}                  ║
║                                                        ║
║  Features:                                             ║
║  - OpenAI Chat Console: POST /api/chat                 ║
║  - Link Shortener: POST /api/links, GET /s/:slug       ║
║  - 15-min Temp Upload: POST /api/upload                ║
║  - File Browser: GET /api/files                        ║
║  - Camera Wall: GET /api/cameras                       ║
║  - Mind-Map Notes: GET /api/notes                      ║
╚════════════════════════════════════════════════════════╝
    `);
    
    // Run initial cleanup on startup
    cleanupExpiredUploads();
});

module.exports = app;
