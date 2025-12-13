/**
 * File cleanup utility for temporary uploads
 * Automatically removes files older than 15 minutes
 */

const fs = require('fs').promises;
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const CLEANUP_INTERVAL = 60 * 1000; // Check every minute
const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
const MAX_CAPACITY_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB cap

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
 * Clean up old files (TTL-based)
 */
async function cleanupOldFiles() {
    try {
        await ensureUploadDir();
        const files = await fs.readdir(UPLOAD_DIR);
        const now = Date.now();
        let filesDeleted = 0;
        let bytesFreed = 0;
        
        // Phase 1: TTL expiry
        for (const file of files) {
            // Skip metadata files, they'll be cleaned with their data files
            if (file.endsWith('.meta.json')) continue;
            
            const filepath = path.join(UPLOAD_DIR, file);
            try {
                const stats = await fs.stat(filepath);
                const age = now - stats.mtimeMs;
                
                if (age > MAX_AGE_MS) {
                    const size = stats.size;
                    await fs.unlink(filepath);
                    // Also try to delete metadata file
                    try {
                        await fs.unlink(filepath + '.meta.json');
                    } catch {
                        // Metadata file might not exist
                    }
                    filesDeleted++;
                    bytesFreed += size;
                    console.log(`[Cleanup TTL] Removed expired file: ${file} (${formatBytes(size)})`);
                }
            } catch (err) {
                console.error(`[Cleanup] Error processing ${file}:`, err.message);
            }
        }
        
        // Phase 2: Capacity enforcement
        const capResult = await cleanupOverCapacity();
        filesDeleted += capResult.filesDeleted;
        bytesFreed += capResult.bytesFreed;
        
        if (filesDeleted > 0) {
            console.log(`[Cleanup] Total: ${filesDeleted} files deleted, ${formatBytes(bytesFreed)} freed`);
        }
    } catch (err) {
        console.error('[Cleanup] Error during cleanup:', err.message);
    }
}

/**
 * Clean up files if over capacity (oldest first)
 */
async function cleanupOverCapacity() {
    let filesDeleted = 0;
    let bytesFreed = 0;
    
    try {
        await ensureUploadDir();
        const files = await fs.readdir(UPLOAD_DIR);
        
        // Get all files with their stats
        const fileStats = [];
        let totalSize = 0;
        
        for (const file of files) {
            if (file.endsWith('.meta.json')) continue;
            
            const filepath = path.join(UPLOAD_DIR, file);
            try {
                const stats = await fs.stat(filepath);
                fileStats.push({
                    name: file,
                    path: filepath,
                    size: stats.size,
                    mtime: stats.mtimeMs
                });
                totalSize += stats.size;
            } catch (err) {
                console.error(`[Cleanup] Error reading ${file}:`, err.message);
            }
        }
        
        // Check if over capacity
        if (totalSize <= MAX_CAPACITY_BYTES) {
            return { filesDeleted, bytesFreed };
        }
        
        console.log(`[Cleanup Cap] Over capacity: ${formatBytes(totalSize)} / ${formatBytes(MAX_CAPACITY_BYTES)}`);
        
        // Sort by mtime (oldest first)
        fileStats.sort((a, b) => a.mtime - b.mtime);
        
        // Delete oldest files until under capacity
        for (const file of fileStats) {
            if (totalSize <= MAX_CAPACITY_BYTES) {
                break;
            }
            
            try {
                await fs.unlink(file.path);
                // Also try to delete metadata file
                try {
                    await fs.unlink(file.path + '.meta.json');
                } catch {
                    // Metadata file might not exist
                }
                
                filesDeleted++;
                bytesFreed += file.size;
                totalSize -= file.size;
                console.log(`[Cleanup Cap] Removed oldest file: ${file.name} (${formatBytes(file.size)})`);
            } catch (err) {
                console.error(`[Cleanup] Error deleting ${file.name}:`, err.message);
            }
        }
    } catch (err) {
        console.error('[Cleanup] Error during capacity cleanup:', err.message);
    }
    
    return { filesDeleted, bytesFreed };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
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
    cleanupOverCapacity,
    startCleanup,
    stopCleanup,
    getFileExpiration,
    UPLOAD_DIR,
    MAX_AGE_MS,
    MAX_CAPACITY_BYTES
};
