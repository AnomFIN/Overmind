/**
 * Admin API Routes
 * Server management endpoints for palvelin.py TUI
 */

const express = require('express');
const router = express.Router();
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

// In-memory metrics tracking
let metrics = {
    requestCount: 0,
    onlineNow: 0,
    peakToday: 0,
    lastResetDate: new Date().toISOString().slice(0, 10),
    recentRequests: [], // timestamps of recent requests for RPS calculation
    activeSessions: new Set(), // track unique session IDs
};

// Session tracking with secure IDs
const sessionTimeouts = new Map();

// Middleware to track requests and sessions
function trackRequest(req, res, next) {
    const now = Date.now();
    
    // Track request
    metrics.requestCount++;
    metrics.recentRequests.push(now);
    
    // Keep only last 5 minutes of requests
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    metrics.recentRequests = metrics.recentRequests.filter(t => t > fiveMinutesAgo);
    
    // Use a hash of IP + User-Agent + Accept-Language for session tracking
    // This improves uniqueness while still being stateless
    // Note: This is for simple monitoring, not authentication or security
    const acceptLang = req.get('accept-language') || '';
    const sessionData = `${req.ip || 'unknown'}_${req.get('user-agent') || 'unknown'}_${acceptLang}`;
    const sessionId = crypto.createHash('sha256').update(sessionData).digest('hex');
    
    // Track session
    metrics.activeSessions.add(sessionId);
    sessionTimeouts.set(sessionId, now);
    
    // Update online count and peak
    metrics.onlineNow = metrics.activeSessions.size;
    if (metrics.onlineNow > metrics.peakToday) {
        metrics.peakToday = metrics.onlineNow;
    }
    
    // Reset peak daily
    const today = new Date().toISOString().slice(0, 10);
    if (today !== metrics.lastResetDate) {
        metrics.peakToday = metrics.onlineNow;
        metrics.lastResetDate = today;
    }
    
    next();
}

// Clean up stale sessions periodically (sessions older than 5 minutes)
setInterval(() => {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    for (const [sessionId, lastSeen] of sessionTimeouts.entries()) {
        if (now - lastSeen > timeout) {
            metrics.activeSessions.delete(sessionId);
            sessionTimeouts.delete(sessionId);
        }
    }
    
    metrics.onlineNow = metrics.activeSessions.size;
}, 60 * 1000); // Check every minute

/**
 * GET /api/admin/metrics
 * Get system and application metrics
 */
router.get('/metrics', (req, res) => {
    try {
        // Calculate requests per minute (rolling 5 min average)
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;
        const recentCount = metrics.recentRequests.filter(t => t > fiveMinutesAgo).length;
        const requestsPerMinute = recentCount / 5;
        
        // Get system uptime
        const uptimeSeconds = os.uptime();
        
        // Get version info
        const packageJson = require('../../package.json');
        
        res.json({
            onlineNow: metrics.onlineNow,
            peakToday: metrics.peakToday,
            requestsPerMinute: Math.round(requestsPerMinute * 10) / 10,
            totalRequests: metrics.requestCount,
            uptimeSeconds: Math.round(uptimeSeconds),
            version: packageJson.version,
            name: packageJson.name
        });
    } catch (err) {
        console.error('[Admin] Metrics error:', err.message);
        res.status(500).json({ error: 'Failed to get metrics' });
    }
});

/**
 * GET /api/admin/uploads
 * Get uploads directory information and file list
 */
router.get('/uploads', async (req, res) => {
    try {
        const { UPLOAD_DIR } = require('../utils/cleanup');
        const uploadsDir = UPLOAD_DIR;
        
        // Get all files
        let files = [];
        let totalBytes = 0;
        
        try {
            const fileList = await fs.readdir(uploadsDir);
            const now = Date.now();
            const TTL_MS = 15 * 60 * 1000; // 15 minutes
            
            for (const filename of fileList) {
                if (filename.endsWith('.meta.json')) continue;
                
                const filepath = path.join(uploadsDir, filename);
                try {
                    const stats = await fs.stat(filepath);
                    const createdAt = new Date(stats.mtimeMs);
                    const expiresAt = new Date(stats.mtimeMs + TTL_MS);
                    
                    // Read metadata if available
                    let originalName = filename;
                    try {
                        const metaPath = path.join(uploadsDir, `${filename}.meta.json`);
                        const metaData = JSON.parse(await fs.readFile(metaPath, 'utf8'));
                        originalName = metaData.originalName || filename;
                    } catch {
                        // No metadata
                    }
                    
                    files.push({
                        name: filename,
                        originalName,
                        sizeBytes: stats.size,
                        createdAt: createdAt.toISOString(),
                        expiresAt: expiresAt.toISOString()
                    });
                    
                    totalBytes += stats.size;
                } catch (err) {
                    console.error(`[Admin] Error reading file ${filename}:`, err.message);
                }
            }
        } catch (err) {
            console.error('[Admin] Error reading uploads directory:', err.message);
        }
        
        // Sort by creation time (newest first)
        files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Count files expiring soon (< 5 minutes)
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        const expiringSoon = files.filter(f => {
            const expires = new Date(f.expiresAt);
            return expires < fiveMinutesFromNow && expires > new Date();
        }).length;
        
        res.json({
            totalBytes,
            maxBytes: 5 * 1024 * 1024 * 1024, // 5 GB cap
            fileCount: files.length,
            expiringSoon,
            files: files.slice(0, 20) // Return only 20 most recent
        });
    } catch (err) {
        console.error('[Admin] Uploads list error:', err.message);
        res.status(500).json({ error: 'Failed to list uploads' });
    }
});

/**
 * POST /api/admin/cleanup
 * Manually trigger cleanup of expired and over-capacity uploads
 */
router.post('/cleanup', async (req, res) => {
    try {
        const { cleanupOldFiles } = require('../utils/cleanup');
        
        // Run cleanup
        await cleanupOldFiles();
        
        // Get updated stats
        const { UPLOAD_DIR } = require('../utils/cleanup');
        let totalBytes = 0;
        let fileCount = 0;
        
        try {
            const fileList = await fs.readdir(UPLOAD_DIR);
            
            for (const filename of fileList) {
                if (filename.endsWith('.meta.json')) continue;
                
                const filepath = path.join(UPLOAD_DIR, filename);
                try {
                    const stats = await fs.stat(filepath);
                    totalBytes += stats.size;
                    fileCount++;
                } catch {
                    // Skip files that can't be read
                }
            }
        } catch {
            // Directory might not exist
        }
        
        res.json({
            success: true,
            message: 'Cleanup completed',
            filesRemaining: fileCount,
            bytesUsed: totalBytes
        });
    } catch (err) {
        console.error('[Admin] Cleanup error:', err.message);
        res.status(500).json({ error: 'Failed to run cleanup' });
    }
});

module.exports = { router, trackRequest, metrics };
