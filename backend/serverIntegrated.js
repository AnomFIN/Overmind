/**
 * AnomHome Overmind - Enhanced Server with Authentication
 * Self-hosted home dashboard for Linux - Version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Load environment variables
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

// Import all dependencies
const cookieParser = require('cookie-parser');
const JsonStorageAdapter = require('./adapters/JsonStorageAdapter');
const AuthService = require('./services/AuthService');
const FriendsService = require('./services/FriendsService');
const ChatService = require('./services/ChatService');
const WebSocketService = require('./services/WebSocketService');
const { createAuthMiddleware, createOptionalAuthMiddleware } = require('./middleware/auth');
const rateLimiters = require('./middleware/rateLimit');
const createAuthRouter = require('./routes/auth');
const createFriendsRouter = require('./routes/friends');
const createChatRouter = require('./routes/chatAuth');

// Import existing routes
const openaiChatRoutes = require('./routes/chat');
const linksRoutes = require('./routes/links');
const uploadsRoutes = require('./routes/uploads');
const filesRoutes = require('./routes/files');
const camerasRoutes = require('./routes/cameras');
const notesRoutes = require('./routes/notes');
const recordingsRoutes = require('./routes/recordings');
const adminRoutes = require('./routes/admin');
const MotionRecorderService = require('./services/motionRecorder');
const { startCleanup } = require('./utils/cleanup');

// Create Express app
const app = express();
const server = http.createServer(app);

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Initialize storage and services
const storage = new JsonStorageAdapter();
const authService = new AuthService(storage);
const friendsService = new FriendsService(storage);
const chatService = new ChatService(storage);

// Initialize storage
storage.init().then(() => {
    console.log('[Server] Storage initialized');
}).catch(err => {
    console.error('[Server] Storage initialization error:', err);
    process.exit(1);
});

// Initialize WebSocket service
let wsService;
try {
    wsService = new WebSocketService(server, authService);
    wsService.startHeartbeat();
    console.log('[Server] WebSocket service initialized');
} catch (e) {
    console.warn('[Server] WebSocket service error:', e.message);
}

// Motion recorder (existing feature)
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
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Attach services to request
app.use((req, res, next) => {
    req.app.locals.motionRecorder = motionRecorder;
    req.app.locals.storage = storage;
    req.app.locals.authService = authService;
    req.app.locals.wsService = wsService;
    next();
});

// Track requests for admin metrics
app.use(adminRoutes.trackRequest);

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Create auth middleware
const authMiddleware = createAuthMiddleware(authService);
const optionalAuthMiddleware = createOptionalAuthMiddleware(authService);

// API Routes - New authenticated features
app.use('/api/auth', createAuthRouter(authService, storage, rateLimiters));
app.use('/api/friends', createFriendsRouter(friendsService, storage, authMiddleware, rateLimiters));
app.use('/api/chatmessages', createChatRouter(chatService, storage, authMiddleware, rateLimiters, wsService));

// API Routes - Existing features
app.use('/api/chat', openaiChatRoutes); // OpenAI console
app.use('/api/links', linksRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/cameras', camerasRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/recordings', recordingsRoutes.router);
app.use('/api/admin', adminRoutes.router);

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
    res.sendFile(path.join(__dirname, '..', 'public', 'GUI.html'));
});

// Root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'GUI.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        features: {
            auth: true,
            chat: true,
            friends: true,
            websocket: !!wsService,
            mindmap: true,
            shortlinks: true,
            uploads: true,
            cameras: true,
            filesBrowser: true
        }
    });
});

// System info
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

// 404 handler for API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('[Server] Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

// Start server
server.listen(PORT, HOST, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AnomHome Overmind - Dashboard Server               ║
║                     Version 1.0.0                            ║
╚══════════════════════════════════════════════════════════════╝

  Server running at: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}
  
  Features:
    • 🔐 User Authentication & Friends
    • 💬 Encrypted Chat & Messaging  
    • 🔌 WebSocket Real-time Updates
    • 🤖 OpenAI Chat Console
    • 🔗 Link Shortener
    • 📤 Temp File Uploads (15-min expiry)
    • 📁 File Browser
    • 📷 Camera Wall & Motion Recording
    • 🗺️ Mind-Map Notes
    
  Press Ctrl+C to stop the server
`);
    startCleanup();
});

// Graceful shutdown
const shutdown = () => {
    console.log('\nShutting down gracefully...');
    const { stopCleanup } = require('./utils/cleanup');
    stopCleanup();
    if (wsService) wsService.shutdown();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;
