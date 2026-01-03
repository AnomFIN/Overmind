/**
 * Encrypted User-to-User Chat Route
 * Supports end-to-end encrypted messaging between users
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Chat rooms storage (in-memory - messages are encrypted, we just relay them)
const chatRooms = new Map();
const activeConnections = new Map();

/**
 * POST /api/user-chat/join
 * Join or create a chat room with enhanced ID support
 */
router.post('/join', (req, res) => {
    try {
        const { roomId, username, joinMethod } = req.body;
        
        if (!roomId || !username) {
            return res.status(400).json({ error: 'Room ID and username are required' });
        }
        
        // Enhanced validation for different ID types
        let actualRoomId = roomId;
        
        if (joinMethod === 'user') {
            // For user IDs, allow more flexible characters (emails, etc.)
            if (!/^[a-zA-Z0-9@._-]{2,50}$/.test(roomId)) {
                return res.status(400).json({ 
                    error: 'User ID contains invalid characters' 
                });
            }
            // Convert user chat to a direct room format
            const participants = [username.toLowerCase(), roomId.toLowerCase()].sort();
            actualRoomId = `direct_${participants[0]}_${participants[1]}`;
        } else {
            // Room ID validation - allow underscores and dashes
            if (!/^[a-zA-Z0-9_-]{2,50}$/.test(roomId)) {
                return res.status(400).json({ 
                    error: 'Room ID must be 2-50 characters (letters, numbers, _, -)'
                });
            }
            actualRoomId = roomId.toUpperCase();
        }
        
        // Create room if it doesn't exist
        if (!chatRooms.has(actualRoomId)) {
            chatRooms.set(actualRoomId, {
                id: actualRoomId,
                type: joinMethod === 'user' ? 'direct' : 'room',
                created: new Date().toISOString(),
                members: new Set(),
                messages: [], // Encrypted messages
                originalTarget: joinMethod === 'user' ? roomId : null
            });
        }
        
        const room = chatRooms.get(actualRoomId);
        room.members.add(username);
        
        res.json({
            success: true,
            roomId: actualRoomId,
            originalRoomId: roomId,
            joinMethod: joinMethod || 'room',
            roomType: room.type,
            memberCount: room.members.size,
            joinedAt: new Date().toISOString()
        });
        
    } catch (err) {
        console.error('[UserChat] Join error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/user-chat/send
 * Send encrypted message to a room
 */
router.post('/send', (req, res) => {
    try {
        const { roomId, username, encryptedMessage, messageId } = req.body;
        
        if (!roomId || !username || !encryptedMessage) {
            return res.status(400).json({ 
                error: 'Room ID, username, and encrypted message are required' 
            });
        }
        
        if (!chatRooms.has(roomId)) {
            return res.status(404).json({ error: 'Chat room not found' });
        }
        
        const room = chatRooms.get(roomId);
        
        // Verify user is member of room
        if (!room.members.has(username)) {
            return res.status(403).json({ error: 'Not a member of this room' });
        }
        
        const message = {
            id: messageId || uuidv4(),
            roomId: roomId,
            username: username,
            encryptedContent: encryptedMessage,
            timestamp: new Date().toISOString()
        };
        
        // Add to room messages (keep last 100 messages)
        room.messages.push(message);
        if (room.messages.length > 100) {
            room.messages.shift();
        }
        
        res.json({
            success: true,
            messageId: message.id,
            timestamp: message.timestamp
        });
        
    } catch (err) {
        console.error('[UserChat] Send error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/user-chat/messages/:roomId
 * Get encrypted messages from a room
 */
router.get('/messages/:roomId', (req, res) => {
    try {
        const { roomId } = req.params;
        const { since } = req.query;
        
        if (!chatRooms.has(roomId)) {
            return res.json({ messages: [] });
        }
        
        const room = chatRooms.get(roomId);
        let messages = room.messages;
        
        // Filter messages since timestamp if provided
        if (since) {
            messages = messages.filter(msg => msg.timestamp > since);
        }
        
        res.json({
            messages: messages,
            memberCount: room.members.size
        });
        
    } catch (err) {
        console.error('[UserChat] Get messages error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/user-chat/leave
 * Leave a chat room
 */
router.post('/leave', (req, res) => {
    try {
        const { roomId, username } = req.body;
        
        if (!roomId || !username) {
            return res.status(400).json({ error: 'Room ID and username are required' });
        }
        
        if (chatRooms.has(roomId)) {
            const room = chatRooms.get(roomId);
            room.members.delete(username);
            
            // Clean up empty rooms after 1 hour
            if (room.members.size === 0) {
                setTimeout(() => {
                    if (chatRooms.has(roomId) && chatRooms.get(roomId).members.size === 0) {
                        chatRooms.delete(roomId);
                        console.log(`[UserChat] Cleaned up empty room: ${roomId}`);
                    }
                }, 3600000); // 1 hour
            }
        }
        
        res.json({ success: true });
        
    } catch (err) {
        console.error('[UserChat] Leave error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/user-chat/status
 * Get chat system status
 */
router.get('/status', (req, res) => {
    res.json({
        online: true,
        activeRooms: chatRooms.size,
        totalMembers: Array.from(chatRooms.values())
            .reduce((total, room) => total + room.members.size, 0)
    });
});

module.exports = router;