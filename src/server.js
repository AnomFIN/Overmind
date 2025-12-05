/**
 * AnomHome Overmind - Main Server
 * 
 * A self-hosted home dashboard with:
 * - OpenAI console
 * - Link shortener
 * - Temp file uploads
 * - File browser
 * - Camera wall
 * - Mind-map notes
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes and middleware
import apiRoutes from './routes/api.js';
import { startCleanupJob } from './services/cleanup.js';
import { apiLimiter } from './middleware/rateLimit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Configuration
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Trust proxy for proper IP detection behind reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API routes with rate limiting
app.use('/api', apiLimiter, apiRoutes);

// Link shortener redirect with rate limiting
app.get('/r/:code', apiLimiter, async (req, res) => {
    try {
        const { default: storage } = await import('./storage.js');
        const link = await storage.findOne('links', 'code', req.params.code);
        
        if (!link) {
            return res.status(404).send('Link not found');
        }
        
        // Check expiry
        if (link.expires_at && new Date(link.expires_at) < new Date()) {
            return res.status(410).send('Link has expired');
        }
        
        // Update stats
        await storage.update('links', 'code', req.params.code, {
            hits: (link.hits || 0) + 1,
            last_hit: new Date().toISOString()
        });
        
        res.redirect(link.url);
    } catch (error) {
        console.error('Redirect error:', error);
        res.status(500).send('Internal server error');
    }
});

// Serve the main dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'GUI.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║           AnomHome Overmind Dashboard                    ║
╠══════════════════════════════════════════════════════════╣
║  Server running at: ${BASE_URL.padEnd(36)}║
║  Dashboard: ${(BASE_URL + '/').padEnd(44)}║
╠══════════════════════════════════════════════════════════╣
║  Features enabled:                                       ║
║  • OpenAI Console: ${(process.env.ENABLE_OPENAI !== 'false' ? 'Yes' : 'No').padEnd(38)}║
║  • Link Shortener: ${(process.env.ENABLE_LINKS !== 'false' ? 'Yes' : 'No').padEnd(38)}║
║  • Temp Uploads:   ${(process.env.ENABLE_UPLOADS !== 'false' ? 'Yes' : 'No').padEnd(38)}║
║  • File Browser:   ${(process.env.ENABLE_FILES !== 'false' ? 'Yes' : 'No').padEnd(38)}║
║  • Camera Wall:    ${(process.env.ENABLE_CAMERAS !== 'false' ? 'Yes' : 'No').padEnd(38)}║
║  • Notes Board:    ${(process.env.ENABLE_NOTES !== 'false' ? 'Yes' : 'No').padEnd(38)}║
╚══════════════════════════════════════════════════════════╝
    `);
    
    // Start the cleanup job for expired uploads
    startCleanupJob();
});

export default app;
