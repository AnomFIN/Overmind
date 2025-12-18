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
}

module.exports = ChatService;
