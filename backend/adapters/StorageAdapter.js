/**
 * Storage Adapter Interface
 * Abstract base class for different storage backends (JSON, MySQL, etc.)
 */

class StorageAdapter {
    /**
     * Initialize the storage adapter
     */
    async init() {
        throw new Error('Method init() must be implemented');
    }

    /**
     * User operations
     */
    async createUser(userData) {
        throw new Error('Method createUser() must be implemented');
    }

    async getUserById(userId) {
        throw new Error('Method getUserById() must be implemented');
    }

    async getUserByEmail(email) {
        throw new Error('Method getUserByEmail() must be implemented');
    }

    async getUserByUsername(username) {
        throw new Error('Method getUserByUsername() must be implemented');
    }

    async updateUser(userId, updates) {
        throw new Error('Method updateUser() must be implemented');
    }

    async deleteUser(userId) {
        throw new Error('Method deleteUser() must be implemented');
    }

    /**
     * Session operations
     */
    async createSession(sessionData) {
        throw new Error('Method createSession() must be implemented');
    }

    async getSession(sessionId) {
        throw new Error('Method getSession() must be implemented');
    }

    async deleteSession(sessionId) {
        throw new Error('Method deleteSession() must be implemented');
    }

    async deleteUserSessions(userId) {
        throw new Error('Method deleteUserSessions() must be implemented');
    }

    /**
     * Friend operations
     */
    async createFriendRequest(fromUserId, toUserId) {
        throw new Error('Method createFriendRequest() must be implemented');
    }

    async getFriendRequests(userId) {
        throw new Error('Method getFriendRequests() must be implemented');
    }

    async acceptFriendRequest(requestId) {
        throw new Error('Method acceptFriendRequest() must be implemented');
    }

    async removeFriend(userId, friendId) {
        throw new Error('Method removeFriend() must be implemented');
    }

    async getFriends(userId) {
        throw new Error('Method getFriends() must be implemented');
    }

    /**
     * Chat operations
     */
    async createThread(threadData) {
        throw new Error('Method createThread() must be implemented');
    }

    async getThread(threadId) {
        throw new Error('Method getThread() must be implemented');
    }

    async getUserThreads(userId) {
        throw new Error('Method getUserThreads() must be implemented');
    }

    async createMessage(messageData) {
        throw new Error('Method createMessage() must be implemented');
    }

    async getMessages(threadId, limit = 50, offset = 0) {
        throw new Error('Method getMessages() must be implemented');
    }

    async markMessageAsRead(messageId, userId) {
        throw new Error('Method markMessageAsRead() must be implemented');
    }

    /**
     * Mind-map operations
     */
    async createMindmap(mindmapData) {
        throw new Error('Method createMindmap() must be implemented');
    }

    async getMindmap(mindmapId) {
        throw new Error('Method getMindmap() must be implemented');
    }

    async updateMindmap(mindmapId, updates) {
        throw new Error('Method updateMindmap() must be implemented');
    }

    async deleteMindmap(mindmapId) {
        throw new Error('Method deleteMindmap() must be implemented');
    }

    async createNode(nodeData) {
        throw new Error('Method createNode() must be implemented');
    }

    async updateNode(nodeId, updates) {
        throw new Error('Method updateNode() must be implemented');
    }

    async deleteNode(nodeId) {
        throw new Error('Method deleteNode() must be implemented');
    }

    async createEdge(edgeData) {
        throw new Error('Method createEdge() must be implemented');
    }

    async deleteEdge(edgeId) {
        throw new Error('Method deleteEdge() must be implemented');
    }

    /**
     * Shortlink operations
     */
    async createShortlink(shortlinkData) {
        throw new Error('Method createShortlink() must be implemented');
    }

    async getShortlink(code) {
        throw new Error('Method getShortlink() must be implemented');
    }

    async getShortlinks(userId = null) {
        throw new Error('Method getShortlinks() must be implemented');
    }

    async updateShortlink(code, updates) {
        throw new Error('Method updateShortlink() must be implemented');
    }

    async deleteShortlink(code) {
        throw new Error('Method deleteShortlink() must be implemented');
    }

    /**
     * Upload metadata operations
     */
    async createUpload(uploadData) {
        throw new Error('Method createUpload() must be implemented');
    }

    async getUpload(uploadId) {
        throw new Error('Method getUpload() must be implemented');
    }

    async getUploads(userId = null) {
        throw new Error('Method getUploads() must be implemented');
    }

    async deleteUpload(uploadId) {
        throw new Error('Method deleteUpload() must be implemented');
    }

    /**
     * Audit log operations
     */
    async logAudit(auditData) {
        throw new Error('Method logAudit() must be implemented');
    }

    async getAuditLogs(filters = {}) {
        throw new Error('Method getAuditLogs() must be implemented');
    }
}

module.exports = StorageAdapter;
