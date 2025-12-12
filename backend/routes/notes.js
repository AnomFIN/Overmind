/**
 * Mind-Map Notes Route
 * Shareable mind-map note system
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../utils/database');

const NOTES_FILE = 'notes.json';

/**
 * Generate a share code
 */
function generateShareCode() {
    // Generate an 8-character alphanumeric code
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Validate hex color format
 */
function isValidHexColor(color) {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * POST /api/notes
 * Create a new note/mind-map
 */
router.post('/', async (req, res) => {
    try {
        const { title, content, nodes, connections, isPublic } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        const note = {
            id: uuidv4(),
            title,
            content: content || '',
            // Mind-map data
            nodes: nodes || [{
                id: 'root',
                text: title,
                x: 400,
                y: 300,
                color: '#4a90d9'
            }],
            connections: connections || [],
            // Sharing
            shareCode: isPublic ? generateShareCode() : null,
            isPublic: isPublic || false,
            // Metadata
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await db.appendData(NOTES_FILE, note);
        
        res.status(201).json({
            success: true,
            note,
            shareUrl: note.shareCode ? `/share/${note.shareCode}` : null
        });
        
    } catch (err) {
        console.error('[Notes] Create error:', err.message);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

/**
 * GET /api/notes
 * List all notes
 */
router.get('/', async (req, res) => {
    try {
        const notes = await db.readData(NOTES_FILE);
        // Return summary without full content
        const summaries = notes.map(note => ({
            id: note.id,
            title: note.title,
            isPublic: note.isPublic,
            shareCode: note.shareCode,
            shareUrl: note.shareCode ? `/share/${note.shareCode}` : null,
            nodeCount: note.nodes?.length || 0,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt
        }));
        res.json(summaries);
    } catch (err) {
        console.error('[Notes] List error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve notes' });
    }
});

/**
 * GET /api/notes/:id
 * Get a specific note
 */
router.get('/:id', async (req, res) => {
    try {
        const note = await db.findById(NOTES_FILE, req.params.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json(note);
    } catch (err) {
        console.error('[Notes] Get error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve note' });
    }
});

/**
 * GET /api/notes/share/:code
 * Get a shared note by share code
 */
router.get('/share/:code', async (req, res) => {
    try {
        const notes = await db.readData(NOTES_FILE);
        const note = notes.find(n => n.shareCode === req.params.code && n.isPublic);
        
        if (!note) {
            return res.status(404).json({ error: 'Shared note not found' });
        }
        
        res.json(note);
    } catch (err) {
        console.error('[Notes] Share get error:', err.message);
        res.status(500).json({ error: 'Failed to retrieve shared note' });
    }
});

/**
 * PUT /api/notes/:id
 * Update a note
 */
router.put('/:id', async (req, res) => {
    try {
        const { title, content, nodes, connections, isPublic } = req.body;
        
        const currentNote = await db.findById(NOTES_FILE, req.params.id);
        if (!currentNote) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        const updates = {
            updatedAt: new Date().toISOString()
        };
        
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (nodes !== undefined) updates.nodes = nodes;
        if (connections !== undefined) updates.connections = connections;
        
        // Handle public/private toggle
        if (isPublic !== undefined) {
            updates.isPublic = isPublic;
            if (isPublic && !currentNote.shareCode) {
                updates.shareCode = generateShareCode();
            } else if (!isPublic) {
                updates.shareCode = null;
            }
        }
        
        const note = await db.updateData(NOTES_FILE, req.params.id, updates);
        
        res.json({
            success: true,
            note,
            shareUrl: note.shareCode ? `/share/${note.shareCode}` : null
        });
        
    } catch (err) {
        console.error('[Notes] Update error:', err.message);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await db.deleteData(NOTES_FILE, req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json({ success: true, message: 'Note deleted' });
    } catch (err) {
        console.error('[Notes] Delete error:', err.message);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

/**
 * POST /api/notes/:id/nodes
 * Add a node to a mind-map
 */
router.post('/:id/nodes', async (req, res) => {
    try {
        const { text, x, y, color, parentId } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Node text is required' });
        }
        
        // Validate color format if provided
        if (color && !isValidHexColor(color)) {
            return res.status(400).json({ 
                error: 'Invalid color format. Use hex color format like #4a90d9' 
            });
        }
        
        const note = await db.findById(NOTES_FILE, req.params.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        const newNode = {
            id: uuidv4(),
            text,
            x: x || Math.random() * 600 + 100,
            y: y || Math.random() * 400 + 100,
            color: color || '#4a90d9'
        };
        
        note.nodes.push(newNode);
        
        // If parentId specified, create a connection
        if (parentId) {
            note.connections.push({
                id: uuidv4(),
                from: parentId,
                to: newNode.id
            });
        }
        
        note.updatedAt = new Date().toISOString();
        await db.updateData(NOTES_FILE, req.params.id, {
            nodes: note.nodes,
            connections: note.connections,
            updatedAt: note.updatedAt
        });
        
        res.status(201).json({
            success: true,
            node: newNode,
            connection: parentId ? note.connections[note.connections.length - 1] : null
        });
        
    } catch (err) {
        console.error('[Notes] Add node error:', err.message);
        res.status(500).json({ error: 'Failed to add node' });
    }
});

/**
 * DELETE /api/notes/:id/nodes/:nodeId
 * Delete a node from a mind-map
 */
router.delete('/:id/nodes/:nodeId', async (req, res) => {
    try {
        const note = await db.findById(NOTES_FILE, req.params.id);
        if (!note) {
            return res.status(404).json({ error: 'Note not found' });
        }
        
        const nodeIndex = note.nodes.findIndex(n => n.id === req.params.nodeId);
        if (nodeIndex === -1) {
            return res.status(404).json({ error: 'Node not found' });
        }
        
        // Don't allow deleting root node
        if (req.params.nodeId === 'root') {
            return res.status(400).json({ error: 'Cannot delete root node' });
        }
        
        // Remove node
        note.nodes.splice(nodeIndex, 1);
        
        // Remove connections involving this node
        note.connections = note.connections.filter(
            c => c.from !== req.params.nodeId && c.to !== req.params.nodeId
        );
        
        note.updatedAt = new Date().toISOString();
        await db.updateData(NOTES_FILE, req.params.id, {
            nodes: note.nodes,
            connections: note.connections,
            updatedAt: note.updatedAt
        });
        
        res.json({ success: true, message: 'Node deleted' });
        
    } catch (err) {
        console.error('[Notes] Delete node error:', err.message);
        res.status(500).json({ error: 'Failed to delete node' });
    }
});

module.exports = router;
