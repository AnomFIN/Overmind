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

    // E2E Encryption Endpoints

    // POST /api/chat/keys
    // Store user's encryption keys
    router.post('/keys', rateLimiters.api, async (req, res) => {
        try {
            const { publicKey, encryptedPrivateKey } = req.body;

            if (!publicKey || !encryptedPrivateKey) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Public key and encrypted private key are required'
                });
            }

            const keys = await chatService.storeKeys(req.user.id, publicKey, encryptedPrivateKey);

            res.json({
                success: true,
                keys: {
                    id: keys.id,
                    publicKey: keys.publicKey,
                    createdAt: keys.createdAt
                }
            });
        } catch (err) {
            console.error('[Chat] Store keys error:', err.message);
            
            res.status(500).json({
                error: 'Failed to store keys',
                message: err.message
            });
        }
    });

    // GET /api/chat/keys/my
    // Get current user's keys (including encrypted private key)
    router.get('/keys/my', async (req, res) => {
        try {
            const keys = await chatService.getUserKeys(req.user.id);

            if (!keys) {
                return res.status(404).json({
                    error: 'Keys not found',
                    message: 'No encryption keys found for this user'
                });
            }

            res.json({
                success: true,
                keys
            });
        } catch (err) {
            console.error('[Chat] Get user keys error:', err.message);
            
            res.status(500).json({
                error: 'Failed to get keys',
                message: err.message
            });
        }
    });

    // GET /api/chat/keys/:userId
    // Get another user's public key
    router.get('/keys/:userId', async (req, res) => {
        try {
            const { userId } = req.params;

            const publicKey = await chatService.getPublicKey(userId);

            if (!publicKey) {
                return res.status(404).json({
                    error: 'Key not found',
                    message: 'No public key found for this user'
                });
            }

            res.json({
                success: true,
                publicKey,
                userId
            });
        } catch (err) {
            console.error('[Chat] Get public key error:', err.message);
            
            res.status(500).json({
                error: 'Failed to get public key',
                message: err.message
            });
        }
    });

    // POST /api/chat/send-encrypted
    // Send encrypted message (with optional file)
    router.post('/send-encrypted', rateLimiters.chat, async (req, res) => {
        try {
            const { threadId, content, metadata } = req.body;

            if (!threadId || !content) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Thread ID and content are required'
                });
            }

            // Validate content length (encrypted content can be larger)
            if (content.length > 50000) {
                return res.status(400).json({
                    error: 'Message too long',
                    message: 'Encrypted message must be less than 50000 characters'
                });
            }

            const message = await chatService.sendEncryptedMessage(
                threadId,
                req.user.id,
                content,
                metadata || {}
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
                action: 'send_encrypted_message',
                resource: 'chat_message',
                details: { 
                    threadId, 
                    messageId: message.id,
                    messageType: metadata?.type || 'text'
                },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                message
            });
        } catch (err) {
            console.error('[Chat] Send encrypted message error:', err.message);
            
            res.status(400).json({
                error: 'Failed to send message',
                message: err.message
            });
        }
    });

    // POST /api/chat/files/upload
    // Upload encrypted file
    router.post('/files/upload', rateLimiters.api, async (req, res) => {
        try {
            const { filename, originalName, encryptedContent, encryptionKey, mimeType, size } = req.body;

            if (!filename || !encryptedContent || !encryptionKey || !mimeType) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Filename, encrypted content, encryption key, and mime type are required'
                });
            }

            // Validate original file size (before encryption)
            const maxSizeBytes = 10 * 1024 * 1024; // 10MB
            if (size && size > maxSizeBytes) {
                return res.status(400).json({
                    error: 'File too large',
                    message: 'File must be less than 10MB'
                });
            }

            // Validate encrypted content size (base64 adds ~33% overhead, so allow up to 13.3MB)
            const maxEncodedSize = 13.3 * 1024 * 1024;
            if (encryptedContent.length > maxEncodedSize) {
                return res.status(400).json({
                    error: 'Encrypted file too large',
                    message: 'Encrypted file must be less than 13.3MB'
                });
            }

            const file = await chatService.uploadEncryptedFile({
                filename,
                originalName,
                encryptedContent,
                encryptionKey,
                mimeType,
                size: size || encryptedContent.length
            }, req.user.id);

            res.json({
                success: true,
                file: {
                    id: file.id,
                    filename: file.filename,
                    originalName: file.originalName,
                    mimeType: file.mimeType,
                    size: file.size,
                    createdAt: file.createdAt
                }
            });
        } catch (err) {
            console.error('[Chat] Upload file error:', err.message);
            
            res.status(500).json({
                error: 'Failed to upload file',
                message: err.message
            });
        }
    });

    // GET /api/chat/files/:fileId
    // Download encrypted file
    router.get('/files/:fileId', async (req, res) => {
        try {
            const { fileId } = req.params;

            const file = await chatService.getEncryptedFile(fileId, req.user.id);

            res.json({
                success: true,
                file
            });
        } catch (err) {
            console.error('[Chat] Download file error:', err.message);
            
            res.status(err.message === 'File not found' ? 404 : 500).json({
                error: 'Failed to download file',
                message: err.message
            });
        }
    });

    // POST /api/chat/typing
    // Update typing status
    router.post('/typing', rateLimiters.api, async (req, res) => {
        try {
            const { threadId, isTyping } = req.body;

            if (!threadId || typeof isTyping !== 'boolean') {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Thread ID and typing status are required'
                });
            }

            await chatService.updateTypingStatus(threadId, req.user.id, isTyping);

            // Broadcast to WebSocket clients if available
            if (wsService) {
                const thread = await storage.getThread(threadId);
                if (thread) {
                    await wsService.broadcastTypingStatus(threadId, req.user.id, isTyping, thread.participants);
                }
            }

            res.json({
                success: true
            });
        } catch (err) {
            console.error('[Chat] Update typing status error:', err.message);
            
            res.status(400).json({
                error: 'Failed to update typing status',
                message: err.message
            });
        }
    });

    // GET /api/chat/typing/:threadId
    // Get typing status for thread
    router.get('/typing/:threadId', async (req, res) => {
        try {
            const { threadId } = req.params;

            const typingUsers = await chatService.getTypingStatus(threadId, req.user.id);

            res.json({
                success: true,
                typingUsers
            });
        } catch (err) {
            console.error('[Chat] Get typing status error:', err.message);
            
            res.status(400).json({
                error: 'Failed to get typing status',
                message: err.message
            });
        }
    });

    // POST /api/chat/read-receipt
    // Create read receipt
    router.post('/read-receipt', rateLimiters.api, async (req, res) => {
        try {
            const { messageId } = req.body;

            if (!messageId) {
                return res.status(400).json({
                    error: 'Missing required field',
                    message: 'Message ID is required'
                });
            }

            await chatService.createReadReceipt(messageId, req.user.id);

            // Broadcast to WebSocket clients if available
            if (wsService) {
                // Get message to find thread participants
                const messages = await storage.readFile('chat_messages.json');
                const message = messages.find(m => m.id === messageId);
                if (message) {
                    const thread = await storage.getThread(message.threadId);
                    if (thread) {
                        await wsService.broadcastReadReceipt(messageId, req.user.id, thread.participants);
                    }
                }
            }

            res.json({
                success: true
            });
        } catch (err) {
            console.error('[Chat] Create read receipt error:', err.message);
            
            res.status(500).json({
                error: 'Failed to create read receipt',
                message: err.message
            });
        }
    });

    // DELETE /api/chat/messages/:messageId
    // Delete message
    router.delete('/messages/:messageId', rateLimiters.api, async (req, res) => {
        try {
            const { messageId } = req.params;
            const { forEveryone } = req.query;

            const deleted = await chatService.deleteMessage(
                messageId, 
                req.user.id, 
                forEveryone === 'true'
            );

            if (!deleted) {
                return res.status(404).json({
                    error: 'Message not found',
                    message: 'The message could not be found or deleted'
                });
            }

            // Broadcast to WebSocket clients if available
            if (wsService && forEveryone === 'true') {
                const messages = await storage.readFile('chat_messages.json');
                const message = messages.find(m => m.id === messageId);
                if (message) {
                    const thread = await storage.getThread(message.threadId);
                    if (thread) {
                        await wsService.broadcastMessageDeleted(messageId, thread.participants);
                    }
                }
            }

            res.json({
                success: true,
                message: 'Message deleted successfully'
            });
        } catch (err) {
            console.error('[Chat] Delete message error:', err.message);
            
            res.status(500).json({
                error: 'Failed to delete message',
                message: err.message
            });
        }
    });

    return router;
}

module.exports = createChatRouter;
