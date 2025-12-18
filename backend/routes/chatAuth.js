/**
 * Chat Routes (New Implementation)
 * Handles chat threads and messages with authentication
 */

const express = require('express');
const router = express.Router();

/**
 * Create chat router with dependencies
 */
function createChatRouter(chatService, storage, authMiddleware, rateLimiters, wsService = null) {
    // All routes require authentication
    router.use(authMiddleware);

    // GET /api/chat/threads
    // Get user's chat threads
    router.get('/threads', async (req, res) => {
        try {
            const threads = await chatService.getUserThreads(req.user.id);

            res.json({
                success: true,
                threads
            });
        } catch (err) {
            console.error('[Chat] Get threads error:', err.message);
            
            res.status(500).json({
                error: 'Failed to get threads',
                message: 'An error occurred while fetching chat threads'
            });
        }
    });

    // POST /api/chat/thread
    // Create or get direct message thread with a friend
    router.post('/thread', rateLimiters.api, async (req, res) => {
        try {
            const { friendId } = req.body;

            if (!friendId) {
                return res.status(400).json({
                    error: 'Missing required field',
                    message: 'Friend ID is required'
                });
            }

            const thread = await chatService.getOrCreateDirectThread(req.user.id, friendId);

            res.json({
                success: true,
                thread
            });
        } catch (err) {
            console.error('[Chat] Create thread error:', err.message);
            
            res.status(400).json({
                error: 'Failed to create thread',
                message: err.message
            });
        }
    });

    // GET /api/chat/messages
    // Get messages in a thread
    router.get('/messages', async (req, res) => {
        try {
            const { threadId, limit, offset } = req.query;

            if (!threadId) {
                return res.status(400).json({
                    error: 'Missing required parameter',
                    message: 'Thread ID is required'
                });
            }

            const messages = await chatService.getMessages(
                threadId,
                req.user.id,
                parseInt(limit) || 50,
                parseInt(offset) || 0
            );

            res.json({
                success: true,
                messages
            });
        } catch (err) {
            console.error('[Chat] Get messages error:', err.message);
            
            res.status(400).json({
                error: 'Failed to get messages',
                message: err.message
            });
        }
    });

    // POST /api/chat/send
    // Send a message
    router.post('/send', rateLimiters.chat, async (req, res) => {
        try {
            const { threadId, content, encryption } = req.body;

            if (!threadId || !content) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Thread ID and content are required'
                });
            }

            // Validate content length
            if (content.length > 10000) {
                return res.status(400).json({
                    error: 'Message too long',
                    message: 'Message must be less than 10000 characters'
                });
            }

            const message = await chatService.sendMessage(
                threadId,
                req.user.id,
                content,
                encryption || {}
            );

            // Broadcast to WebSocket clients if available
            if (wsService) {
                const thread = await storage.getThread(threadId);
                if (thread) {
                    await wsService.broadcastMessage(message, thread.participants);
                }
            }

            // Log audit
            await storage.logAudit({
                userId: req.user.id,
                action: 'send_message',
                resource: 'chat_message',
                details: { 
                    threadId, 
                    messageId: message.id,
                    encrypted: !!encryption
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                message
            });
        } catch (err) {
            console.error('[Chat] Send message error:', err.message);
            
            res.status(400).json({
                error: 'Failed to send message',
                message: err.message
            });
        }
    });

    // POST /api/chat/mark-read
    // Mark message as read
    router.post('/mark-read', rateLimiters.api, async (req, res) => {
        try {
            const { messageId } = req.body;

            if (!messageId) {
                return res.status(400).json({
                    error: 'Missing required field',
                    message: 'Message ID is required'
                });
            }

            await chatService.markAsRead(messageId, req.user.id);

            res.json({
                success: true,
                message: 'Message marked as read'
            });
        } catch (err) {
            console.error('[Chat] Mark as read error:', err.message);
            
            res.status(500).json({
                error: 'Failed to mark message as read',
                message: err.message
            });
        }
    });

    return router;
}

module.exports = createChatRouter;
