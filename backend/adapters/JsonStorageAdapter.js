/**
 * JSON Storage Adapter
 * File-based storage implementation using JSON files
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const StorageAdapter = require('./StorageAdapter');

// Configuration constants
const MAX_AUDIT_LOGS = 10000; // Maximum number of audit logs to keep

class JsonStorageAdapter extends StorageAdapter {
    constructor(dataDir = null) {
        super();
        this.dataDir = dataDir || path.join(__dirname, '..', '..', 'data');
    }

    async init() {
        // Ensure data directory exists
        await fs.mkdir(this.dataDir, { recursive: true });
        
        // Initialize data files if they don't exist
        const files = [
            'users.json',
            'sessions.json',
            'friends.json',
            'friend_requests.json',
            'chat_threads.json',
            'chat_messages.json',
            'chat_keys.json',
            'chat_files.json',
            'chat_typing_status.json',
            'chat_read_receipts.json',
            'mindmaps.json',
            'mindmap_nodes.json',
            'mindmap_edges.json',
            'shortlinks.json',
            'uploads.json',
            'audit_logs.json',
            'personas.json',
            'app_config.json'
        ];

        for (const file of files) {
            const filepath = path.join(this.dataDir, file);
            try {
                await fs.access(filepath);
            } catch {
                await fs.writeFile(filepath, JSON.stringify([]), 'utf8');
            }
        }
    }

    async readFile(filename) {
        const filepath = path.join(this.dataDir, filename);
        try {
            const data = await fs.readFile(filepath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') {
                return [];
            }
            throw err;
        }
    }

    async writeFile(filename, data) {
        const filepath = path.join(this.dataDir, filename);
        await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf8');
    }

    // User operations
    async createUser(userData) {
        const users = await this.readFile('users.json');
        const user = {
            id: uuidv4(),
            username: userData.username,
            email: userData.email,
            passwordHash: userData.passwordHash,
            displayName: userData.displayName || userData.username || userData.email.split('@')[0],
            role: userData.role || 'user',
            requirePasswordChange: userData.requirePasswordChange || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...userData
        };
        delete user.password; // Remove plain password if accidentally passed
        users.push(user);
        await this.writeFile('users.json', users);
        return user;
    }

    async getUserById(userId) {
        const users = await this.readFile('users.json');
        return users.find(u => u.id === userId) || null;
    }

    async getUserByEmail(email) {
        const users = await this.readFile('users.json');
        return users.find(u => u.email === email) || null;
    }

    async getUserByUsername(username) {
        const users = await this.readFile('users.json');
        return users.find(u => u.username === username) || null;
    }

    async updateUser(userId, updates) {
        const users = await this.readFile('users.json');
        const index = users.findIndex(u => u.id === userId);
        if (index === -1) return null;
        
        users[index] = {
            ...users[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        await this.writeFile('users.json', users);
        return users[index];
    }

    async deleteUser(userId) {
        const users = await this.readFile('users.json');
        const index = users.findIndex(u => u.id === userId);
        if (index === -1) return false;
        
        users.splice(index, 1);
        await this.writeFile('users.json', users);
        return true;
    }

    // Session operations
    async createSession(sessionData) {
        const sessions = await this.readFile('sessions.json');
        const session = {
            id: uuidv4(),
            userId: sessionData.userId,
            token: sessionData.token || uuidv4(),
            expiresAt: sessionData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            ...sessionData
        };
        sessions.push(session);
        await this.writeFile('sessions.json', sessions);
        return session;
    }

    async getSession(sessionId) {
        const sessions = await this.readFile('sessions.json');
        const session = sessions.find(s => s.id === sessionId || s.token === sessionId);
        
        if (!session) return null;
        
        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
            await this.deleteSession(session.id);
            return null;
        }
        
        return session;
    }

    async deleteSession(sessionId) {
        const sessions = await this.readFile('sessions.json');
        const index = sessions.findIndex(s => s.id === sessionId || s.token === sessionId);
        if (index === -1) return false;
        
        sessions.splice(index, 1);
        await this.writeFile('sessions.json', sessions);
        return true;
    }

    async deleteUserSessions(userId) {
        const sessions = await this.readFile('sessions.json');
        const filtered = sessions.filter(s => s.userId !== userId);
        await this.writeFile('sessions.json', filtered);
        return true;
    }

    // Friend operations
    async createFriendRequest(fromUserId, toUserId) {
        const requests = await this.readFile('friend_requests.json');
        
        // Check if request already exists
        const existing = requests.find(r => 
            (r.fromUserId === fromUserId && r.toUserId === toUserId) ||
            (r.fromUserId === toUserId && r.toUserId === fromUserId)
        );
        
        if (existing) {
            throw new Error('Friend request already exists');
        }
        
        const request = {
            id: uuidv4(),
            fromUserId,
            toUserId,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        requests.push(request);
        await this.writeFile('friend_requests.json', requests);
        return request;
    }

    async getFriendRequests(userId) {
        const requests = await this.readFile('friend_requests.json');
        return requests.filter(r => r.toUserId === userId && r.status === 'pending');
    }

    async acceptFriendRequest(requestId) {
        const requests = await this.readFile('friend_requests.json');
        const request = requests.find(r => r.id === requestId);
        
        if (!request) {
            throw new Error('Friend request not found');
        }
        
        // Create friendship
        const friends = await this.readFile('friends.json');
        friends.push({
            id: uuidv4(),
            userId: request.fromUserId,
            friendId: request.toUserId,
            createdAt: new Date().toISOString()
        });
        friends.push({
            id: uuidv4(),
            userId: request.toUserId,
            friendId: request.fromUserId,
            createdAt: new Date().toISOString()
        });
        await this.writeFile('friends.json', friends);
        
        // Remove request
        const index = requests.findIndex(r => r.id === requestId);
        requests.splice(index, 1);
        await this.writeFile('friend_requests.json', requests);
        
        return true;
    }

    async removeFriend(userId, friendId) {
        const friends = await this.readFile('friends.json');
        const filtered = friends.filter(f => 
            !(f.userId === userId && f.friendId === friendId) &&
            !(f.userId === friendId && f.friendId === userId)
        );
        await this.writeFile('friends.json', filtered);
        return true;
    }

    async getFriends(userId) {
        const friends = await this.readFile('friends.json');
        const userFriends = friends.filter(f => f.userId === userId);
        
        // Get friend details
        const users = await this.readFile('users.json');
        return userFriends.map(f => {
            const friend = users.find(u => u.id === f.friendId);
            return friend ? {
                id: friend.id,
                email: friend.email,
                displayName: friend.displayName,
                friendshipId: f.id,
                friendsSince: f.createdAt
            } : null;
        }).filter(f => f !== null);
    }

    // Chat operations
    async createThread(threadData) {
        const threads = await this.readFile('chat_threads.json');
        const thread = {
            id: uuidv4(),
            participants: threadData.participants || [],
            type: threadData.type || 'direct',
            name: threadData.name || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        threads.push(thread);
        await this.writeFile('chat_threads.json', threads);
        return thread;
    }

    async getThread(threadId) {
        const threads = await this.readFile('chat_threads.json');
        return threads.find(t => t.id === threadId) || null;
    }

    async getUserThreads(userId) {
        const threads = await this.readFile('chat_threads.json');
        return threads.filter(t => t.participants.includes(userId));
    }

    async createMessage(messageData) {
        const messages = await this.readFile('chat_messages.json');
        const message = {
            id: uuidv4(),
            threadId: messageData.threadId,
            senderId: messageData.senderId,
            content: messageData.content, // Encrypted content
            encryptionVersion: messageData.encryptionVersion || 'v1',
            nonce: messageData.nonce || null,
            createdAt: new Date().toISOString(),
            readBy: []
        };
        messages.push(message);
        await this.writeFile('chat_messages.json', messages);
        
        // Update thread timestamp
        const threads = await this.readFile('chat_threads.json');
        const thread = threads.find(t => t.id === messageData.threadId);
        if (thread) {
            thread.updatedAt = new Date().toISOString();
            thread.lastMessageId = message.id;
            await this.writeFile('chat_threads.json', threads);
        }
        
        return message;
    }

    async getMessages(threadId, limit = 50, offset = 0) {
        const messages = await this.readFile('chat_messages.json');
        const threadMessages = messages
            .filter(m => m.threadId === threadId)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .slice(offset, offset + limit);
        return threadMessages;
    }

    async markMessageAsRead(messageId, userId) {
        const messages = await this.readFile('chat_messages.json');
        const message = messages.find(m => m.id === messageId);
        
        if (message && !message.readBy.includes(userId)) {
            message.readBy.push(userId);
            await this.writeFile('chat_messages.json', messages);
        }
        
        return true;
    }

    // Mind-map operations
    async createMindmap(mindmapData) {
        const mindmaps = await this.readFile('mindmaps.json');
        const mindmap = {
            id: uuidv4(),
            userId: mindmapData.userId,
            title: mindmapData.title,
            description: mindmapData.description || '',
            isPublic: mindmapData.isPublic || false,
            shareCode: mindmapData.shareCode || uuidv4().substring(0, 8),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        mindmaps.push(mindmap);
        await this.writeFile('mindmaps.json', mindmaps);
        return mindmap;
    }

    async getMindmap(mindmapId) {
        const mindmaps = await this.readFile('mindmaps.json');
        const mindmap = mindmaps.find(m => m.id === mindmapId || m.shareCode === mindmapId);
        
        if (!mindmap) return null;
        
        // Get nodes and edges
        const nodes = await this.readFile('mindmap_nodes.json');
        const edges = await this.readFile('mindmap_edges.json');
        
        mindmap.nodes = nodes.filter(n => n.mindmapId === mindmap.id);
        mindmap.edges = edges.filter(e => e.mindmapId === mindmap.id);
        
        return mindmap;
    }

    async updateMindmap(mindmapId, updates) {
        const mindmaps = await this.readFile('mindmaps.json');
        const index = mindmaps.findIndex(m => m.id === mindmapId);
        if (index === -1) return null;
        
        mindmaps[index] = {
            ...mindmaps[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        await this.writeFile('mindmaps.json', mindmaps);
        return mindmaps[index];
    }

    async deleteMindmap(mindmapId) {
        const mindmaps = await this.readFile('mindmaps.json');
        const index = mindmaps.findIndex(m => m.id === mindmapId);
        if (index === -1) return false;
        
        mindmaps.splice(index, 1);
        await this.writeFile('mindmaps.json', mindmaps);
        
        // Delete associated nodes and edges
        const nodes = await this.readFile('mindmap_nodes.json');
        const edges = await this.readFile('mindmap_edges.json');
        
        await this.writeFile('mindmap_nodes.json', nodes.filter(n => n.mindmapId !== mindmapId));
        await this.writeFile('mindmap_edges.json', edges.filter(e => e.mindmapId !== mindmapId));
        
        return true;
    }

    async createNode(nodeData) {
        const nodes = await this.readFile('mindmap_nodes.json');
        const node = {
            id: uuidv4(),
            mindmapId: nodeData.mindmapId,
            content: nodeData.content,
            x: nodeData.x || 0,
            y: nodeData.y || 0,
            color: nodeData.color || '#3b82f6',
            createdAt: new Date().toISOString()
        };
        nodes.push(node);
        await this.writeFile('mindmap_nodes.json', nodes);
        return node;
    }

    async updateNode(nodeId, updates) {
        const nodes = await this.readFile('mindmap_nodes.json');
        const index = nodes.findIndex(n => n.id === nodeId);
        if (index === -1) return null;
        
        nodes[index] = { ...nodes[index], ...updates };
        await this.writeFile('mindmap_nodes.json', nodes);
        return nodes[index];
    }

    async deleteNode(nodeId) {
        const nodes = await this.readFile('mindmap_nodes.json');
        const index = nodes.findIndex(n => n.id === nodeId);
        if (index === -1) return false;
        
        nodes.splice(index, 1);
        await this.writeFile('mindmap_nodes.json', nodes);
        
        // Delete associated edges
        const edges = await this.readFile('mindmap_edges.json');
        await this.writeFile('mindmap_edges.json', 
            edges.filter(e => e.fromNodeId !== nodeId && e.toNodeId !== nodeId)
        );
        
        return true;
    }

    async createEdge(edgeData) {
        const edges = await this.readFile('mindmap_edges.json');
        const edge = {
            id: uuidv4(),
            mindmapId: edgeData.mindmapId,
            fromNodeId: edgeData.fromNodeId,
            toNodeId: edgeData.toNodeId,
            label: edgeData.label || '',
            createdAt: new Date().toISOString()
        };
        edges.push(edge);
        await this.writeFile('mindmap_edges.json', edges);
        return edge;
    }

    async deleteEdge(edgeId) {
        const edges = await this.readFile('mindmap_edges.json');
        const index = edges.findIndex(e => e.id === edgeId);
        if (index === -1) return false;
        
        edges.splice(index, 1);
        await this.writeFile('mindmap_edges.json', edges);
        return true;
    }

    // Shortlink operations (preserve existing links.json structure)
    async createShortlink(shortlinkData) {
        const links = await this.readFile('links.json');
        const link = {
            id: uuidv4(),
            code: shortlinkData.code,
            url: shortlinkData.url,
            userId: shortlinkData.userId || null,
            clicks: 0,
            expiresAt: shortlinkData.expiresAt || null,
            createdAt: new Date().toISOString()
        };
        links.push(link);
        await this.writeFile('links.json', links);
        return link;
    }

    async getShortlink(code) {
        const links = await this.readFile('links.json');
        const link = links.find(l => l.code === code);
        
        if (!link) return null;
        
        // Check expiration
        if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
            return null;
        }
        
        return link;
    }

    async getShortlinks(userId = null) {
        const links = await this.readFile('links.json');
        if (userId) {
            return links.filter(l => l.userId === userId);
        }
        return links;
    }

    async updateShortlink(code, updates) {
        const links = await this.readFile('links.json');
        const index = links.findIndex(l => l.code === code);
        if (index === -1) return null;
        
        links[index] = { ...links[index], ...updates };
        await this.writeFile('links.json', links);
        return links[index];
    }

    async deleteShortlink(code) {
        const links = await this.readFile('links.json');
        const index = links.findIndex(l => l.code === code);
        if (index === -1) return false;
        
        links.splice(index, 1);
        await this.writeFile('links.json', links);
        return true;
    }

    // Upload metadata operations
    async createUpload(uploadData) {
        const uploads = await this.readFile('uploads.json');
        const upload = {
            id: uuidv4(),
            filename: uploadData.filename,
            originalName: uploadData.originalName,
            size: uploadData.size,
            mimetype: uploadData.mimetype,
            userId: uploadData.userId || null,
            expiresAt: uploadData.expiresAt,
            createdAt: new Date().toISOString()
        };
        uploads.push(upload);
        await this.writeFile('uploads.json', uploads);
        return upload;
    }

    async getUpload(uploadId) {
        const uploads = await this.readFile('uploads.json');
        return uploads.find(u => u.id === uploadId) || null;
    }

    async getUploads(userId = null) {
        const uploads = await this.readFile('uploads.json');
        if (userId) {
            return uploads.filter(u => u.userId === userId);
        }
        return uploads;
    }

    async deleteUpload(uploadId) {
        const uploads = await this.readFile('uploads.json');
        const index = uploads.findIndex(u => u.id === uploadId);
        if (index === -1) return false;
        
        uploads.splice(index, 1);
        await this.writeFile('uploads.json', uploads);
        return true;
    }

    // Audit log operations
    async logAudit(auditData) {
        const logs = await this.readFile('audit_logs.json');
        const log = {
            id: uuidv4(),
            userId: auditData.userId || null,
            action: auditData.action,
            resource: auditData.resource || null,
            details: auditData.details || {},
            ipAddress: auditData.ipAddress || null,
            userAgent: auditData.userAgent || null,
            timestamp: new Date().toISOString()
        };
        logs.push(log);
        
        // Keep only last MAX_AUDIT_LOGS to prevent file from growing too large
        if (logs.length > MAX_AUDIT_LOGS) {
            logs.splice(0, logs.length - MAX_AUDIT_LOGS);
        }
        
        await this.writeFile('audit_logs.json', logs);
        return log;
    }

    async getAuditLogs(filters = {}) {
        const logs = await this.readFile('audit_logs.json');
        let filtered = logs;
        
        if (filters.userId) {
            filtered = filtered.filter(l => l.userId === filters.userId);
        }
        
        if (filters.action) {
            filtered = filtered.filter(l => l.action === filters.action);
        }
        
        if (filters.resource) {
            filtered = filtered.filter(l => l.resource === filters.resource);
        }
        
        if (filters.startDate) {
            filtered = filtered.filter(l => new Date(l.timestamp) >= new Date(filters.startDate));
        }
        
        if (filters.endDate) {
            filtered = filtered.filter(l => new Date(l.timestamp) <= new Date(filters.endDate));
        }
        
        // Sort by timestamp descending
        filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Apply limit
        const limit = filters.limit || 100;
        return filtered.slice(0, limit);
    }

    // Persona operations
    async createPersona(personaData) {
        const personas = await this.readFile('personas.json');
        const persona = {
            id: uuidv4(),
            name: personaData.name,
            systemPrompt: personaData.systemPrompt,
            temperature: personaData.temperature || 0.7,
            model: personaData.model || 'gpt-4',
            enabled: personaData.enabled !== undefined ? personaData.enabled : true,
            isDefault: personaData.isDefault || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        personas.push(persona);
        await this.writeFile('personas.json', personas);
        return persona;
    }

    async getPersonas() {
        return await this.readFile('personas.json');
    }

    async getPersona(personaId) {
        const personas = await this.readFile('personas.json');
        return personas.find(p => p.id === personaId) || null;
    }

    async updatePersona(personaId, updates) {
        const personas = await this.readFile('personas.json');
        const index = personas.findIndex(p => p.id === personaId);
        if (index === -1) return null;
        
        personas[index] = {
            ...personas[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        await this.writeFile('personas.json', personas);
        return personas[index];
    }

    async deletePersona(personaId) {
        const personas = await this.readFile('personas.json');
        const index = personas.findIndex(p => p.id === personaId);
        if (index === -1) return false;
        
        personas.splice(index, 1);
        await this.writeFile('personas.json', personas);
        return true;
    }

    // App Config operations
    async getAppConfig() {
        const configs = await this.readFile('app_config.json');
        return configs.length > 0 ? configs[0] : null;
    }

    async updateAppConfig(updates) {
        let configs = await this.readFile('app_config.json');
        
        if (configs.length === 0) {
            // Create default config
            const config = {
                id: uuidv4(),
                logoUrl: 'logo.png',
                backgroundUrl: 'bg.png',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                ...updates
            };
            configs.push(config);
        } else {
            // Update existing config
            configs[0] = {
                ...configs[0],
                ...updates,
                updatedAt: new Date().toISOString()
            };
        }
        
        await this.writeFile('app_config.json', configs);
        return configs[0];
    }

    // Camera operations (using existing cameras.json)
    async createCamera(cameraData) {
        const cameras = await this.readFile('cameras.json');
        const camera = {
            id: uuidv4(),
            name: cameraData.name,
            url: cameraData.url,
            enabled: cameraData.enabled !== undefined ? cameraData.enabled : true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        cameras.push(camera);
        await this.writeFile('cameras.json', cameras);
        return camera;
    }

    async getCameras() {
        return await this.readFile('cameras.json');
    }

    async getCamera(cameraId) {
        const cameras = await this.readFile('cameras.json');
        return cameras.find(c => c.id === cameraId) || null;
    }

    async updateCamera(cameraId, updates) {
        const cameras = await this.readFile('cameras.json');
        const index = cameras.findIndex(c => c.id === cameraId);
        if (index === -1) return null;
        
        cameras[index] = {
            ...cameras[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        await this.writeFile('cameras.json', cameras);
        return cameras[index];
    }

    async deleteCamera(cameraId) {
        const cameras = await this.readFile('cameras.json');
        const index = cameras.findIndex(c => c.id === cameraId);
        if (index === -1) return false;
        
        cameras.splice(index, 1);
        await this.writeFile('cameras.json', cameras);
        return true;
    }

    // E2E Encrypted Chat operations

    /**
     * Store user's encryption keys
     */
    async storeUserKeys(userId, publicKey, encryptedPrivateKey) {
        const keys = await this.readFile('chat_keys.json');
        
        // Check if user already has keys
        const existingIndex = keys.findIndex(k => k.userId === userId);
        
        const keyData = {
            id: existingIndex >= 0 ? keys[existingIndex].id : uuidv4(),
            userId,
            publicKey,
            encryptedPrivateKey,
            createdAt: existingIndex >= 0 ? keys[existingIndex].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        if (existingIndex >= 0) {
            keys[existingIndex] = keyData;
        } else {
            keys.push(keyData);
        }
        
        await this.writeFile('chat_keys.json', keys);
        return keyData;
    }

    /**
     * Get user's public key
     */
    async getUserPublicKey(userId) {
        const keys = await this.readFile('chat_keys.json');
        const userKey = keys.find(k => k.userId === userId);
        return userKey ? userKey.publicKey : null;
    }

    /**
     * Get user's encrypted private key (for the user to decrypt client-side)
     */
    async getUserKeys(userId) {
        const keys = await this.readFile('chat_keys.json');
        return keys.find(k => k.userId === userId) || null;
    }

    /**
     * Store encrypted file
     */
    async storeEncryptedFile(fileData) {
        const files = await this.readFile('chat_files.json');
        const file = {
            id: uuidv4(),
            filename: fileData.filename,
            originalName: fileData.originalName,
            encryptedContent: fileData.encryptedContent,
            encryptionKey: fileData.encryptionKey,
            mimeType: fileData.mimeType,
            size: fileData.size,
            uploadedBy: fileData.uploadedBy,
            createdAt: new Date().toISOString()
        };
        files.push(file);
        await this.writeFile('chat_files.json', files);
        return file;
    }

    /**
     * Get encrypted file
     */
    async getEncryptedFile(fileId) {
        const files = await this.readFile('chat_files.json');
        return files.find(f => f.id === fileId) || null;
    }

    /**
     * Delete encrypted file
     */
    async deleteEncryptedFile(fileId) {
        const files = await this.readFile('chat_files.json');
        const index = files.findIndex(f => f.id === fileId);
        if (index === -1) return false;
        
        files.splice(index, 1);
        await this.writeFile('chat_files.json', files);
        return true;
    }

    /**
     * Update typing status
     */
    async updateTypingStatus(conversationId, userId, isTyping) {
        const statuses = await this.readFile('chat_typing_status.json');
        const index = statuses.findIndex(s => s.conversationId === conversationId && s.userId === userId);
        
        const status = {
            id: index >= 0 ? statuses[index].id : uuidv4(),
            conversationId,
            userId,
            isTyping,
            updatedAt: new Date().toISOString()
        };
        
        if (index >= 0) {
            statuses[index] = status;
        } else {
            statuses.push(status);
        }
        
        await this.writeFile('chat_typing_status.json', statuses);
        return status;
    }

    /**
     * Get typing status for conversation
     */
    async getTypingStatus(conversationId) {
        const statuses = await this.readFile('chat_typing_status.json');
        // Only return recent typing statuses (within last 10 seconds)
        const cutoff = new Date(Date.now() - 10000);
        return statuses.filter(s => 
            s.conversationId === conversationId && 
            s.isTyping && 
            new Date(s.updatedAt) > cutoff
        );
    }

    /**
     * Create read receipt
     */
    async createReadReceipt(messageId, userId) {
        const receipts = await this.readFile('chat_read_receipts.json');
        
        // Check if receipt already exists
        const existing = receipts.find(r => r.messageId === messageId && r.userId === userId);
        if (existing) {
            return existing;
        }
        
        const receipt = {
            id: uuidv4(),
            messageId,
            userId,
            readAt: new Date().toISOString()
        };
        
        receipts.push(receipt);
        await this.writeFile('chat_read_receipts.json', receipts);
        return receipt;
    }

    /**
     * Get read receipts for message
     */
    async getReadReceipts(messageId) {
        const receipts = await this.readFile('chat_read_receipts.json');
        return receipts.filter(r => r.messageId === messageId);
    }

    /**
     * Mark message as delivered
     */
    async markMessageDelivered(messageId) {
        const messages = await this.readFile('chat_messages.json');
        const message = messages.find(m => m.id === messageId);
        
        if (message && !message.deliveredAt) {
            message.deliveredAt = new Date().toISOString();
            await this.writeFile('chat_messages.json', messages);
        }
        
        return true;
    }

    /**
     * Delete message (soft delete with flags)
     */
    async deleteMessage(messageId, userId, forEveryone = false) {
        const messages = await this.readFile('chat_messages.json');
        const message = messages.find(m => m.id === messageId);
        
        if (!message) {
            return false;
        }
        
        if (forEveryone && message.senderId === userId) {
            // Delete for everyone
            message.deletedAt = new Date().toISOString();
            message.deletedForEveryone = true;
            message.content = '[Message deleted]';
        } else {
            // Delete for self only
            if (!message.deletedFor) {
                message.deletedFor = [];
            }
            if (!message.deletedFor.includes(userId)) {
                message.deletedFor.push(userId);
            }
        }
        
        await this.writeFile('chat_messages.json', messages);
        return true;
    }

    /**
     * Enhanced createMessage with encryption metadata and file support
     */
    async createMessageWithEncryption(messageData) {
        const messages = await this.readFile('chat_messages.json');
        const message = {
            id: uuidv4(),
            threadId: messageData.threadId,
            senderId: messageData.senderId,
            content: messageData.content, // Encrypted content
            encryptionMetadata: messageData.encryptionMetadata || {},
            messageType: messageData.messageType || 'text',
            fileId: messageData.fileId || null,
            createdAt: new Date().toISOString(),
            deliveredAt: null,
            deletedAt: null,
            deletedForEveryone: false,
            deletedFor: [],
            readBy: []
        };
        messages.push(message);
        await this.writeFile('chat_messages.json', messages);
        
        // Update thread timestamp
        const threads = await this.readFile('chat_threads.json');
        const thread = threads.find(t => t.id === messageData.threadId);
        if (thread) {
            thread.updatedAt = new Date().toISOString();
            thread.lastMessageId = message.id;
            await this.writeFile('chat_threads.json', threads);
        }
        
        return message;
    }

    /**
     * Get messages with filtering for deleted messages
     */
    async getMessagesForUser(threadId, userId, limit = 50, offset = 0) {
        const messages = await this.readFile('chat_messages.json');
        const threadMessages = messages
            .filter(m => {
                if (m.threadId !== threadId) return false;
                // Filter out messages deleted for this user
                if (m.deletedForEveryone) return false;
                if (m.deletedFor && m.deletedFor.includes(userId)) return false;
                return true;
            })
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .slice(offset, offset + limit);
        return threadMessages;
    }
}

module.exports = JsonStorageAdapter;
