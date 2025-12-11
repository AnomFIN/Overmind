/**
 * Local File Browser Route
 * Browse local filesystem with safety restrictions
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Get root directory from environment or default to home
function getRoot() {
    return process.env.FILE_BROWSER_ROOT || os.homedir();
}

/**
 * Validate path is within allowed root
 */
function validatePath(requestedPath) {
    const root = getRoot();
    const resolved = path.resolve(root, requestedPath || '');
    
    // Ensure path is within root
    if (!resolved.startsWith(root)) {
        return null;
    }
    
    return resolved;
}

/**
 * Get file type from stats
 */
function getFileType(stats) {
    if (stats.isDirectory()) return 'directory';
    if (stats.isFile()) return 'file';
    if (stats.isSymbolicLink()) return 'symlink';
    return 'unknown';
}

/**
 * Get file extension category
 */
function getFileCategory(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    const categories = {
        image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'],
        video: ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv'],
        audio: ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'],
        document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt'],
        text: ['.txt', '.md', '.json', '.xml', '.yaml', '.yml', '.csv', '.log'],
        code: ['.js', '.py', '.html', '.css', '.java', '.c', '.cpp', '.h', '.sh', '.ts'],
        archive: ['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2']
    };
    
    for (const [category, extensions] of Object.entries(categories)) {
        if (extensions.includes(ext)) return category;
    }
    
    return 'other';
}

/**
 * Format file size
 */
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * GET /api/files
 * List directory contents
 */
router.get('/', async (req, res) => {
    try {
        const requestedPath = req.query.path || '';
        const resolved = validatePath(requestedPath);
        
        if (!resolved) {
            return res.status(403).json({ error: 'Access denied: path outside allowed directory' });
        }
        
        const stats = await fs.stat(resolved);
        
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: 'Path is not a directory' });
        }
        
        const entries = await fs.readdir(resolved, { withFileTypes: true });
        const root = getRoot();
        
        const items = await Promise.all(entries.map(async (entry) => {
            const entryPath = path.join(resolved, entry.name);
            let itemStats;
            
            try {
                itemStats = await fs.stat(entryPath);
            } catch {
                // Can't access this file
                return null;
            }
            
            return {
                name: entry.name,
                path: path.relative(root, entryPath),
                type: getFileType(itemStats),
                category: entry.isFile() ? getFileCategory(entry.name) : null,
                size: itemStats.size,
                sizeFormatted: formatSize(itemStats.size),
                modified: itemStats.mtime.toISOString(),
                isHidden: entry.name.startsWith('.')
            };
        }));
        
        // Filter out nulls and sort (directories first, then alphabetically)
        const filtered = items
            .filter(item => item !== null)
            .sort((a, b) => {
                if (a.type === 'directory' && b.type !== 'directory') return -1;
                if (a.type !== 'directory' && b.type === 'directory') return 1;
                return a.name.localeCompare(b.name);
            });
        
        res.json({
            path: path.relative(root, resolved) || '.',
            absolutePath: resolved,
            root: root,
            parent: resolved === root ? null : path.relative(root, path.dirname(resolved)) || '.',
            items: filtered
        });
        
    } catch (err) {
        console.error('[Files] List error:', err.message);
        if (err.code === 'ENOENT') {
            return res.status(404).json({ error: 'Directory not found' });
        }
        if (err.code === 'EACCES') {
            return res.status(403).json({ error: 'Permission denied' });
        }
        res.status(500).json({ error: 'Failed to list directory' });
    }
});

/**
 * GET /api/files/read
 * Read file contents (text files only, with size limit)
 */
router.get('/read', async (req, res) => {
    try {
        const requestedPath = req.query.path;
        
        if (!requestedPath) {
            return res.status(400).json({ error: 'Path is required' });
        }
        
        const resolved = validatePath(requestedPath);
        
        if (!resolved) {
            return res.status(403).json({ error: 'Access denied: path outside allowed directory' });
        }
        
        const stats = await fs.stat(resolved);
        
        if (!stats.isFile()) {
            return res.status(400).json({ error: 'Path is not a file' });
        }
        
        // Limit file size to 1MB for text preview
        if (stats.size > 1024 * 1024) {
            return res.status(413).json({ error: 'File too large for preview (max 1MB)' });
        }
        
        const category = getFileCategory(resolved);
        if (!['text', 'code'].includes(category) && !resolved.endsWith('.json')) {
            return res.status(400).json({ error: 'File type not supported for preview' });
        }
        
        const content = await fs.readFile(resolved, 'utf8');
        
        res.json({
            path: path.relative(getRoot(), resolved),
            filename: path.basename(resolved),
            content,
            size: stats.size,
            category
        });
        
    } catch (err) {
        console.error('[Files] Read error:', err.message);
        if (err.code === 'ENOENT') {
            return res.status(404).json({ error: 'File not found' });
        }
        if (err.code === 'EACCES') {
            return res.status(403).json({ error: 'Permission denied' });
        }
        res.status(500).json({ error: 'Failed to read file' });
    }
});

/**
 * GET /api/files/download
 * Download a file
 */
router.get('/download', async (req, res) => {
    try {
        const requestedPath = req.query.path;
        
        if (!requestedPath) {
            return res.status(400).json({ error: 'Path is required' });
        }
        
        const resolved = validatePath(requestedPath);
        
        if (!resolved) {
            return res.status(403).json({ error: 'Access denied: path outside allowed directory' });
        }
        
        try {
            await fs.access(resolved);
        } catch {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const stats = await fs.stat(resolved);
        
        if (!stats.isFile()) {
            return res.status(400).json({ error: 'Path is not a file' });
        }
        
        res.download(resolved);
        
    } catch (err) {
        console.error('[Files] Download error:', err.message);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

/**
 * GET /api/files/search
 * Search for files
 */
router.get('/search', async (req, res) => {
    try {
        const { query, path: searchPath } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        
        const resolved = validatePath(searchPath || '');
        
        if (!resolved) {
            return res.status(403).json({ error: 'Access denied: path outside allowed directory' });
        }
        
        const results = [];
        const maxResults = 100;
        const root = getRoot();
        
        async function searchDir(dir, depth = 0) {
            if (depth > 5 || results.length >= maxResults) return;
            
            try {
                const entries = await fs.readdir(dir, { withFileTypes: true });
                
                for (const entry of entries) {
                    if (results.length >= maxResults) break;
                    if (entry.name.startsWith('.')) continue; // Skip hidden files
                    
                    const entryPath = path.join(dir, entry.name);
                    
                    if (entry.name.toLowerCase().includes(query.toLowerCase())) {
                        try {
                            const stats = await fs.stat(entryPath);
                            results.push({
                                name: entry.name,
                                path: path.relative(root, entryPath),
                                type: getFileType(stats),
                                size: stats.size,
                                sizeFormatted: formatSize(stats.size)
                            });
                        } catch {
                            // Skip inaccessible files
                        }
                    }
                    
                    if (entry.isDirectory()) {
                        await searchDir(entryPath, depth + 1);
                    }
                }
            } catch {
                // Skip inaccessible directories
            }
        }
        
        await searchDir(resolved);
        
        res.json({
            query,
            searchPath: path.relative(root, resolved) || '.',
            results,
            truncated: results.length >= maxResults
        });
        
    } catch (err) {
        console.error('[Files] Search error:', err.message);
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;
