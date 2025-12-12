/**
 * Link Shortener Route
 * Fast URL shortening with JSON storage
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/database');

const LINKS_FILE = 'links.json';

/**
 * Generate short code
 */
function generateShortCode() {
    // Generate a 6-character alphanumeric code
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Validate URL
 */
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Validate custom code format
 */
function isValidCustomCode(code) {
    // Only alphanumeric, hyphens, underscores, 3-50 characters
    return /^[a-zA-Z0-9_-]{3,50}$/.test(code);
}

/**
 * POST /api/links
 * Create a new short link
 */
router.post('/', async (req, res) => {
    try {
        const { url, customCode } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        if (!isValidUrl(url)) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        
        // Validate custom code if provided
        if (customCode && !isValidCustomCode(customCode)) {
            return res.status(400).json({ 
                error: 'Invalid custom code format. Use only alphanumeric characters, hyphens, and underscores (3-50 characters)' 
            });
        }
        
        const links = await db.readData(LINKS_FILE);
        
        // Generate or use custom code
        let code = customCode || generateShortCode();
        
        // Ensure code is unique
        while (links.find(l => l.code === code)) {
            if (customCode) {
                return res.status(409).json({ error: 'Custom code already exists' });
            }
            code = generateShortCode();
        }
        
        const link = {
            id: uuidv4(),
            code,
            url,
            clicks: 0,
            createdAt: new Date().toISOString()
        };
        
        await db.appendData(LINKS_FILE, link);
        
        res.status(201).json({
            success: true,
            link: {
                ...link,
                shortUrl: `/s/${code}`
            }
        });
        
    } catch (err) {
        console.error('[Links] Create error:', err.message);
        res.status(500).json({ error: 'Failed to create short link' });
    }
});

/**
 * GET /api/links
 * List all short links
 */
router.get('/', async (req, res) => {
    try {
        const links = await db.readData(LINKS_FILE);
        res.json(links.map(link => ({
            ...link,
            shortUrl: `/s/${link.code}`
        })));
    } catch (err) {
        console.error('[Links] List error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve links' });
    }
});

/**
 * GET /api/links/:id
 * Get a specific link by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const link = await db.findById(LINKS_FILE, req.params.id);
        if (!link) {
            return res.status(404).json({ error: 'Link not found' });
        }
        res.json({
            ...link,
            shortUrl: `/s/${link.code}`
        });
    } catch (err) {
        console.error('[Links] Get error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve link' });
    }
});

/**
 * DELETE /api/links/:id
 * Delete a short link
 */
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await db.deleteData(LINKS_FILE, req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Link not found' });
        }
        res.json({ success: true, message: 'Link deleted' });
    } catch (err) {
        console.error('[Links] Delete error:', err.message);
        res.status(500).json({ error: 'Failed to delete link' });
    }
});

/**
 * Resolve short code (used by main server)
 */
async function resolveShortCode(code) {
    const links = await db.readData(LINKS_FILE);
    const link = links.find(l => l.code === code);
    
    if (link) {
        // Increment click count
        link.clicks++;
        await db.writeData(LINKS_FILE, links);
    }
    
    return link;
}

module.exports = router;
module.exports.resolveShortCode = resolveShortCode;
