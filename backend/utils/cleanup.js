/**
 * File cleanup utility for temporary uploads
 * Automatically removes files older than 15 minutes
 */

const fs = require('fs').promises;
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const CLEANUP_INTERVAL = 60 * 1000; // Check every minute
const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

let cleanupTimer = null;

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir() {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }
}

/**
 * Clean up old files
 */
async function cleanupOldFiles() {
    try {
        await ensureUploadDir();
        const files = await fs.readdir(UPLOAD_DIR);
        const now = Date.now();
        
        for (const file of files) {
            // Skip metadata files, they'll be cleaned with their data files
            if (file.endsWith('.meta.json')) continue;
            
            const filepath = path.join(UPLOAD_DIR, file);
            try {
                const stats = await fs.stat(filepath);
                const age = now - stats.mtimeMs;
                
                if (age > MAX_AGE_MS) {
                    await fs.unlink(filepath);
                    // Also try to delete metadata file
                    try {
                        await fs.unlink(filepath + '.meta.json');
                    } catch {
                        // Metadata file might not exist
                    }
                    console.log(`[Cleanup] Removed expired file: ${file}`);
                }
            } catch (err) {
                console.error(`[Cleanup] Error processing ${file}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[Cleanup] Error during cleanup:', err.message);
    }
}

/**
 * Start the cleanup timer
 */
function startCleanup() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
    }
    
    // Run cleanup immediately
    cleanupOldFiles();
    
    // Then run periodically
    cleanupTimer = setInterval(cleanupOldFiles, CLEANUP_INTERVAL);
    console.log('[Cleanup] Started file cleanup service (15-minute expiration)');
}

/**
 * Stop the cleanup timer
 */
function stopCleanup() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
        console.log('[Cleanup] Stopped file cleanup service');
    }
}

/**
 * Get file expiration time
 * @param {string} filename - Name of the uploaded file
 * @returns {Promise<Date|null>} Expiration date or null if file not found
 */
async function getFileExpiration(filename) {
    const filepath = path.join(UPLOAD_DIR, filename);
    try {
        const stats = await fs.stat(filepath);
        return new Date(stats.mtimeMs + MAX_AGE_MS);
    } catch {
        return null;
    }
}

module.exports = {
    ensureUploadDir,
    cleanupOldFiles,
    startCleanup,
    stopCleanup,
    getFileExpiration,
    UPLOAD_DIR,
    MAX_AGE_MS
};
