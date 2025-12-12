/**
 * AnomHome Overmind - Main Server
 * Self-hosted home dashboard for Linux
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                const value = valueParts.join('=');
                if (key && value !== undefined) {
                    process.env[key.trim()] = value.trim();
                }
            }
        });
    }
}

loadEnv();

// Import routes
const chatRoutes = require('./routes/chat');
const linksRoutes = require('./routes/links');
const uploadsRoutes = require('./routes/uploads');
const filesRoutes = require('./routes/files');
const camerasRoutes = require('./routes/cameras');
const notesRoutes = require('./routes/notes');
const recordingsRoutes = require('./routes/recordings');
const MotionRecorderService = require('./services/motionRecorder');

// Import utilities
const { startCleanup } = require('./utils/cleanup');

// Create Express app
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Motion recorder bootstrap
const motionRecorder = new MotionRecorderService({
    onRecordingFinalized: async ({ cameraId, filePath, startedAt }) => {
        const { writeData, readData } = require('./utils/database');
        const { buildRecordingId } = require('./routes/recordings');
        const recordings = await readData('recordings.json', []);
        const stat = fs.statSync(filePath);
        recordings.push({
            id: buildRecordingId(cameraId, filePath),
            cameraId,
            filePath,
            date: startedAt.toISOString().slice(0, 10),
            size: stat.size,
            createdAt: startedAt.toISOString()
        });
        await writeData('recordings.json', recordings);
    },
    logger: console
});
motionRecorder.refreshConfigs();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
    req.app.locals.motionRecorder = motionRecorder;
    next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/cameras', camerasRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/recordings', recordingsRoutes.router);

// Short link redirect
app.get('/s/:code', async (req, res) => {
    try {
        const { resolveShortCode } = require('./routes/links');
        const link = await resolveShortCode(req.params.code);
        
        if (link) {
            res.redirect(302, link.url);
        } else {
            res.status(404).send('Short link not found');
        }
    } catch (err) {
        console.error('[Server] Short link error:', err.message);
        res.status(500).send('Error resolving short link');
    }
});

// Shared note view
app.get('/share/:code', (req, res) => {
    // Serve the main page, the frontend will handle loading the shared note
    res.sendFile(path.join(__dirname, '..', 'public', 'GUI.html'));
});

// Serve GUI.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'GUI.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// System info endpoint
app.get('/api/system', (req, res) => {
    const os = require('os');
    res.json({
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        memory: {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
        },
        cpus: os.cpus().length,
        loadavg: os.loadavg()
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Server] Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
const server = app.listen(PORT, HOST, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AnomHome Overmind - Dashboard Server               ║
╚══════════════════════════════════════════════════════════════╝

  Server running at: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}
  
  Features:
    • OpenAI Chat Console: /api/chat
    • Link Shortener: /api/links
    • Temp File Uploads: /api/uploads (15-min expiry)
    • File Browser: /api/files
    • Camera Wall: /api/cameras
    • Mind-Map Notes: /api/notes
    
  Press Ctrl+C to stop the server
`);
    
    // Start file cleanup service
    startCleanup();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    const { stopCleanup } = require('./utils/cleanup');
    stopCleanup();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    const { stopCleanup } = require('./utils/cleanup');
    stopCleanup();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;
