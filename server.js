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
app.use('/uploads', express.static('uploads'));

// Data file paths
const DATA_DIR = path.join(__dirname, 'data');
const LINKS_FILE = path.join(DATA_DIR, 'links.json');
const UPLOADS_FILE = path.join(DATA_DIR, 'uploads.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

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
    const cleanupHours = parseInt(process.env.UPLOAD_CLEANUP_HOURS) || 24;
    
    const uploadInfo = {
        id: path.basename(req.file.filename, path.extname(req.file.filename)),
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + cleanupHours * 60 * 60 * 1000).toISOString()
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

// Run cleanup every hour
setInterval(cleanupExpiredUploads, 60 * 60 * 1000);

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
║  - File Upload: POST /api/upload                       ║
╚════════════════════════════════════════════════════════╝
    `);
    
    // Run initial cleanup on startup
    cleanupExpiredUploads();
});

module.exports = app;
