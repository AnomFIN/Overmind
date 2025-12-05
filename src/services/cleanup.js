/**
 * Cleanup Service for AnomHome Overmind
 * 
 * Handles automatic cleanup of expired temporary uploads.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import storage from '../storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Cleanup interval in milliseconds (1 minute)
const CLEANUP_INTERVAL = 60 * 1000;

let cleanupTimer = null;

/**
 * Clean up expired uploads
 */
async function cleanupExpiredUploads() {
    try {
        const uploads = await storage.read('uploads');
        const now = new Date();
        let deletedCount = 0;
        
        for (const upload of uploads) {
            const expiresAt = new Date(upload.expires_at);
            
            if (expiresAt <= now) {
                // Delete the file
                const filePath = path.join(UPLOAD_DIR, upload.filename);
                try {
                    await fs.unlink(filePath);
                    deletedCount++;
                } catch (err) {
                    if (err.code !== 'ENOENT') {
                        console.warn(`Failed to delete expired file ${upload.filename}:`, err.message);
                    }
                }
            }
        }
        
        // Remove expired entries from storage
        const removed = await storage.removeWhere('uploads', upload => {
            return new Date(upload.expires_at) <= now;
        });
        
        if (deletedCount > 0 || removed > 0) {
            console.log(`[Cleanup] Removed ${deletedCount} files and ${removed} database entries`);
        }
    } catch (error) {
        console.error('[Cleanup] Error during cleanup:', error);
    }
}

/**
 * Clean up orphaned files (files not in database)
 */
async function cleanupOrphanedFiles() {
    try {
        const uploads = await storage.read('uploads');
        const knownFiles = new Set(uploads.map(u => u.filename));
        
        // Ensure upload directory exists
        try {
            await fs.mkdir(UPLOAD_DIR, { recursive: true });
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
        
        const files = await fs.readdir(UPLOAD_DIR);
        let deletedCount = 0;
        
        for (const file of files) {
            // Skip hidden files and directories
            if (file.startsWith('.')) continue;
            
            const filePath = path.join(UPLOAD_DIR, file);
            const stat = await fs.stat(filePath);
            
            // Skip directories
            if (stat.isDirectory()) continue;
            
            // If file is not in database, delete it
            if (!knownFiles.has(file)) {
                try {
                    await fs.unlink(filePath);
                    deletedCount++;
                } catch (err) {
                    console.warn(`Failed to delete orphaned file ${file}:`, err.message);
                }
            }
        }
        
        if (deletedCount > 0) {
            console.log(`[Cleanup] Removed ${deletedCount} orphaned files`);
        }
    } catch (error) {
        console.error('[Cleanup] Error cleaning orphaned files:', error);
    }
}

/**
 * Run full cleanup cycle
 */
async function runCleanup() {
    await cleanupExpiredUploads();
    await cleanupOrphanedFiles();
}

/**
 * Start the cleanup job
 */
export function startCleanupJob() {
    // Run immediately on start
    runCleanup();
    
    // Then run periodically
    cleanupTimer = setInterval(runCleanup, CLEANUP_INTERVAL);
    
    console.log('[Cleanup] Started cleanup job (runs every 1 minute)');
}

/**
 * Stop the cleanup job
 */
export function stopCleanupJob() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
        console.log('[Cleanup] Stopped cleanup job');
    }
}

export { runCleanup, cleanupExpiredUploads, cleanupOrphanedFiles };
