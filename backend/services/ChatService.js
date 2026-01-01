/**
 * Chat Service
 * Handles chat threads and messages
 */

class ChatService {
    constructor(storageAdapter) {
        this.storage = storageAdapter;
    }

    /**
     * Create or get direct message thread between two users
     */
    async getOrCreateDirectThread(userId1, userId2) {
        // Check if users are friends
        const friends = await this.storage.getFriends(userId1);
        if (!friends.some(f => f.id === userId2)) {
            throw new Error('You can only chat with friends');
        }

        // Check if thread already exists
        const userThreads = await this.storage.getUserThreads(userId1);
        const existingThread = userThreads.find(t => 
            t.type === 'direct' &&
            t.participants.length === 2 &&
            t.participants.includes(userId1) &&
            t.participants.includes(userId2)
        );

        if (existingThread) {
            return existingThread;
        }

        // Create new thread
        const thread = await this.storage.createThread({
            participants: [userId1, userId2],
            type: 'direct'
        });

        return thread;
    }

    /**
     * Get user's threads
     */
    async getUserThreads(userId) {
        const threads = await this.storage.getUserThreads(userId);

        // Get participant details for each thread
        const threadsWithDetails = await Promise.all(
            threads.map(async (thread) => {
                const participants = await Promise.all(
                    thread.participants
                        .filter(id => id !== userId)
                        .map(id => this.storage.getUserById(id))
                );

                return {
                    ...thread,
                    participants: participants.filter(p => p !== null).map(p => ({
                        id: p.id,
                        email: p.email,
                        displayName: p.displayName
                    }))
                };
            })
        );

        // Sort by most recent activity
        threadsWithDetails.sort((a, b) => 
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );

        return threadsWithDetails;
    }

    /**
     * Get messages in a thread
     */
    async getMessages(threadId, userId, limit = 50, offset = 0) {
        // Verify user is participant
        const thread = await this.storage.getThread(threadId);
        if (!thread || !thread.participants.includes(userId)) {
            throw new Error('Access denied');
        }

        const messages = await this.storage.getMessages(threadId, limit, offset);

        // Get sender details
        const messagesWithSenders = await Promise.all(
            messages.map(async (message) => {
                const sender = await this.storage.getUserById(message.senderId);
                return {
                    ...message,
                    sender: sender ? {
                        id: sender.id,
                        displayName: sender.displayName
                    } : null
                };
            })
        );

        return messagesWithSenders;
    }

    /**
     * Send message
     */
    async sendMessage(threadId, userId, content, encryptionData = {}) {
        // Verify user is participant
        const thread = await this.storage.getThread(threadId);
        if (!thread || !thread.participants.includes(userId)) {
            throw new Error('Access denied');
        }

        const message = await this.storage.createMessage({
            threadId,
            senderId: userId,
            content,
            encryptionVersion: encryptionData.version || null,
            nonce: encryptionData.nonce || null
        });

        // Get sender details
        const sender = await this.storage.getUserById(userId);
        
        return {
            ...message,
            sender: sender ? {
                id: sender.id,
                displayName: sender.displayName
            } : null
        };
    }

    /**
     * Mark message as read
     */
    async markAsRead(messageId, userId) {
        await this.storage.markMessageAsRead(messageId, userId);
        return true;
    }

    /**
     * Store user's encryption keys
     */
    async storeKeys(userId, publicKey, encryptedPrivateKey) {
        return await this.storage.storeUserKeys(userId, publicKey, encryptedPrivateKey);
    }

    /**
     * Get user's public key
     */
    async getPublicKey(userId) {
        return await this.storage.getUserPublicKey(userId);
    }

    /**
     * Get user's encryption keys (including encrypted private key)
     */
    async getUserKeys(userId) {
        return await this.storage.getUserKeys(userId);
    }

    /**
     * Send encrypted message with file support
     */
    async sendEncryptedMessage(threadId, userId, content, metadata = {}) {
        // Verify user is participant
        const thread = await this.storage.getThread(threadId);
        if (!thread || !thread.participants.includes(userId)) {
            throw new Error('Access denied');
        }

        const message = await this.storage.createMessageWithEncryption({
            threadId,
            senderId: userId,
            content,
            encryptionMetadata: metadata.encryption || {},
            messageType: metadata.type || 'text',
            fileId: metadata.fileId || null
        });

        // Get sender details
        const sender = await this.storage.getUserById(userId);
        
        return {
            ...message,
            sender: sender ? {
                id: sender.id,
                displayName: sender.displayName
            } : null
        };
    }

    /**
     * Get messages for user (filtering deleted messages)
     */
    async getMessagesForUser(threadId, userId, limit = 50, offset = 0) {
        // Verify user is participant
        const thread = await this.storage.getThread(threadId);
        if (!thread || !thread.participants.includes(userId)) {
            throw new Error('Access denied');
        }

        const messages = await this.storage.getMessagesForUser(threadId, userId, limit, offset);

        // Get sender details and read receipts
        const messagesWithDetails = await Promise.all(
            messages.map(async (message) => {
                const sender = await this.storage.getUserById(message.senderId);
                const readReceipts = await this.storage.getReadReceipts(message.id);
                
                return {
                    ...message,
                    sender: sender ? {
                        id: sender.id,
                        displayName: sender.displayName
                    } : null,
                    readReceipts
                };
            })
        );

        return messagesWithDetails;
    }

    /**
     * Upload encrypted file
     */
    async uploadEncryptedFile(fileData, uploadedBy) {
        return await this.storage.storeEncryptedFile({
            ...fileData,
            uploadedBy
        });
    }

    /**
     * Get encrypted file
     */
    async getEncryptedFile(fileId, userId) {
        const file = await this.storage.getEncryptedFile(fileId);
        
        if (!file) {
            throw new Error('File not found');
        }

        // Verify user has access to this file
        // Check if user uploaded the file OR received it in a message
        if (file.uploadedBy === userId) {
            return file;
        }

        // Check if file is part of any message in user's threads
        const userThreads = await this.storage.getUserThreads(userId);
        const threadIds = userThreads.map(t => t.id);
        
        const messages = await this.storage.readFile('chat_messages.json');
        const hasAccess = messages.some(m => 
            threadIds.includes(m.threadId) && 
            m.fileId === fileId
        );

        if (!hasAccess) {
            throw new Error('Access denied');
        }
        
        return file;
    }

    /**
     * Update typing status
     */
    async updateTypingStatus(threadId, userId, isTyping) {
        // Verify user is participant
        const thread = await this.storage.getThread(threadId);
        if (!thread || !thread.participants.includes(userId)) {
            throw new Error('Access denied');
        }

        return await this.storage.updateTypingStatus(threadId, userId, isTyping);
    }

    /**
     * Get typing status
     */
    async getTypingStatus(threadId, userId) {
        // Verify user is participant
        const thread = await this.storage.getThread(threadId);
        if (!thread || !thread.participants.includes(userId)) {
            throw new Error('Access denied');
        }

        return await this.storage.getTypingStatus(threadId);
    }

    /**
     * Mark message as delivered
     */
    async markAsDelivered(messageId, userId) {
        // Verify user is participant in the message's thread
        const messages = await this.storage.readFile('chat_messages.json');
        const message = messages.find(m => m.id === messageId);
        
        if (!message) {
            throw new Error('Message not found');
        }

        const thread = await this.storage.getThread(message.threadId);
        if (!thread || !thread.participants || !thread.participants.includes(userId)) {
            throw new Error('Access denied');
        }

        return await this.storage.markMessageDelivered(messageId);
    }

    /**
     * Create read receipt
     */
    async createReadReceipt(messageId, userId) {
        // Verify user is participant in the message's thread
        const messages = await this.storage.readFile('chat_messages.json');
        const message = messages.find(m => m.id === messageId);
        
        if (!message) {
            throw new Error('Message not found');
        }

        const thread = await this.storage.getThread(message.threadId);
        if (!thread || !thread.participants || !thread.participants.includes(userId)) {
            throw new Error('Access denied');
        }

        await this.storage.createReadReceipt(messageId, userId);
        return true;
    }

    /**
     * Delete message
     */
    async deleteMessage(messageId, userId, forEveryone = false) {
        // Fetch message to verify permissions
        const message = await this.storage.getMessage(messageId);
        if (!message) {
            throw new Error('Message not found');
        }

        // For "delete for everyone", only the sender can perform this action
        if (forEveryone && message.senderId !== userId) {
            throw new Error('Access denied');
        }

        // Verify user is a participant in the conversation
        const thread = await this.storage.getThread(message.threadId);
        if (!thread || !thread.participants || !thread.participants.includes(userId)) {
            throw new Error('Access denied');
        }
        // Fetch message to verify permissions
        const messages = await this.storage.readFile('chat_messages.json');
        const message = messages.find(m => m.id === messageId);
        
        if (!message) {
            throw new Error('Message not found');
        }

        // For "delete for everyone", only the sender can perform this action
        if (forEveryone && message.senderId !== userId) {
            throw new Error('Only the sender can delete messages for everyone');
        }

        // Verify user is a participant in the conversation
        const thread = await this.storage.getThread(message.threadId);
        if (!thread || !thread.participants || !thread.participants.includes(userId)) {
            throw new Error('Access denied');
        }

        return await this.storage.deleteMessage(messageId, userId, forEveryone);
    }
}

module.exports = ChatService;
