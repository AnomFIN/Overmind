/**
 * WebSocket Service for Real-time Chat
 * Handles WebSocket connections and real-time message delivery
 */

const WebSocket = require('ws');

class WebSocketService {
    constructor(server, authService) {
        this.wss = new WebSocket.Server({ 
            server,
            path: '/ws/chat'
        });
        
        this.authService = authService;
        this.clients = new Map(); // userId -> Set of WebSocket connections
        
        this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
        
        console.log('[WebSocket] Service initialized on /ws/chat');
    }

    /**
     * Handle new WebSocket connection
     */
    async handleConnection(ws, req) {
        console.log('[WebSocket] New connection attempt');

        // Extract token from query string or headers
        const url = new URL(req.url, 'http://localhost');
        const token = url.searchParams.get('token') || req.headers['sec-websocket-protocol'];

        if (!token) {
            console.log('[WebSocket] No token provided');
            ws.close(4001, 'Authentication required');
            return;
        }

        // Verify session
        try {
            const user = await this.authService.verifySession(token);
            
            if (!user) {
                console.log('[WebSocket] Invalid token');
                ws.close(4001, 'Invalid or expired token');
                return;
            }

            console.log(`[WebSocket] User ${user.id} connected`);

            // Store connection
            if (!this.clients.has(user.id)) {
                this.clients.set(user.id, new Set());
            }
            this.clients.get(user.id).add(ws);

            // Set up connection metadata
            ws.userId = user.id;
            ws.isAlive = true;

            // Send connection confirmation
            this.sendToClient(ws, {
                type: 'connected',
                userId: user.id
            });

            // Handle incoming messages
            ws.on('message', (data) => this.handleMessage(ws, data, user));

            // Handle pong (heartbeat response)
            ws.on('pong', () => {
                ws.isAlive = true;
            });

            // Handle disconnection
            ws.on('close', () => {
                console.log(`[WebSocket] User ${user.id} disconnected`);
                const userConnections = this.clients.get(user.id);
                if (userConnections) {
                    userConnections.delete(ws);
                    if (userConnections.size === 0) {
                        this.clients.delete(user.id);
                    }
                }
            });

            // Handle errors
            ws.on('error', (err) => {
                console.error(`[WebSocket] Error for user ${user.id}:`, err.message);
            });

        } catch (err) {
            console.error('[WebSocket] Authentication error:', err);
            ws.close(4001, 'Authentication failed');
        }
    }

    /**
     * Handle incoming message from client
     */
    async handleMessage(ws, data, user) {
        try {
            const message = JSON.parse(data.toString());
            
            console.log(`[WebSocket] Message from ${user.id}:`, message.type);

            switch (message.type) {
                case 'ping':
                    this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
                    break;

                case 'typing':
                    // Broadcast typing indicator to thread participants
                    if (message.threadId) {
                        this.broadcastToThread(message.threadId, user.id, {
                            type: 'typing',
                            threadId: message.threadId,
                            userId: user.id,
                            isTyping: message.isTyping
                        });
                    }
                    break;

                case 'subscribe':
                    // Subscribe to a thread (for future use)
                    if (message.threadId) {
                        ws.subscribedThreads = ws.subscribedThreads || new Set();
                        ws.subscribedThreads.add(message.threadId);
                    }
                    break;

                default:
                    console.log(`[WebSocket] Unknown message type: ${message.type}`);
            }

        } catch (err) {
            console.error('[WebSocket] Message handling error:', err);
            this.sendToClient(ws, {
                type: 'error',
                message: 'Invalid message format'
            });
        }
    }

    /**
     * Send message to specific client
     */
    sendToClient(ws, data) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data));
        }
    }

    /**
     * Send message to all connections of a user
     */
    sendToUser(userId, data) {
        const connections = this.clients.get(userId);
        if (connections) {
            const payload = JSON.stringify(data);
            connections.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(payload);
                }
            });
        }
    }

    /**
     * Broadcast new message to thread participants
     */
    async broadcastMessage(message, threadParticipants) {
        const payload = {
            type: 'message',
            message
        };

        threadParticipants.forEach(userId => {
            if (userId !== message.senderId) {
                this.sendToUser(userId, payload);
            }
        });
    }

    /**
     * Broadcast event to thread participants (e.g., typing indicator)
     */
    broadcastToThread(threadId, senderId, data) {
        // Send to all clients except sender
        this.clients.forEach((connections, userId) => {
            if (userId !== senderId) {
                connections.forEach(ws => {
                    if (ws.subscribedThreads?.has(threadId) || true) {
                        this.sendToClient(ws, data);
                    }
                });
            }
        });
    }

    /**
     * Notify user of new friend request
     */
    notifyFriendRequest(userId, request) {
        this.sendToUser(userId, {
            type: 'friend_request',
            request
        });
    }

    /**
     * Notify user of accepted friend request
     */
    notifyFriendAccepted(userId, friendId) {
        this.sendToUser(userId, {
            type: 'friend_accepted',
            friendId
        });
    }

    /**
     * Start heartbeat to detect dead connections
     */
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.wss.clients.forEach(ws => {
                if (ws.isAlive === false) {
                    console.log(`[WebSocket] Terminating dead connection for user ${ws.userId}`);
                    return ws.terminate();
                }

                ws.isAlive = false;
                ws.ping();
            });
        }, 30000); // 30 seconds

        console.log('[WebSocket] Heartbeat started');
    }

    /**
     * Stop heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            console.log('[WebSocket] Heartbeat stopped');
        }
    }

    /**
     * Get number of connected users
     */
    getConnectedUsersCount() {
        return this.clients.size;
    }

    /**
     * Get number of active connections
     */
    getConnectionsCount() {
        let count = 0;
        this.clients.forEach(connections => {
            count += connections.size;
        });
        return count;
    }

    /**
     * Close all connections and shut down
     */
    shutdown() {
        console.log('[WebSocket] Shutting down...');
        this.stopHeartbeat();
        
        this.wss.clients.forEach(ws => {
            ws.close(1001, 'Server shutting down');
        });

        this.wss.close(() => {
            console.log('[WebSocket] Shut down complete');
        });
    }
}

module.exports = WebSocketService;
