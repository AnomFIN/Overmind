/**
 * Friends Service
 * Handles friend requests and friendships
 */

class FriendsService {
    constructor(storageAdapter) {
        this.storage = storageAdapter;
    }

    /**
     * Send friend request
     */
    async sendRequest(fromUserId, toEmail) {
        // Get target user by email
        const toUser = await this.storage.getUserByEmail(toEmail);
        if (!toUser) {
            throw new Error('User not found');
        }

        // Can't send request to self
        if (fromUserId === toUser.id) {
            throw new Error('You cannot send a friend request to yourself');
        }

        // Check if already friends
        const friends = await this.storage.getFriends(fromUserId);
        if (friends.some(f => f.id === toUser.id)) {
            throw new Error('You are already friends with this user');
        }

        // Create friend request
        const request = await this.storage.createFriendRequest(fromUserId, toUser.id);
        
        return request;
    }

    /**
     * Get pending friend requests for user
     */
    async getRequests(userId) {
        const requests = await this.storage.getFriendRequests(userId);
        
        // Get sender details for each request
        const requestsWithDetails = await Promise.all(
            requests.map(async (request) => {
                const sender = await this.storage.getUserById(request.fromUserId);
                return {
                    id: request.id,
                    from: sender ? {
                        id: sender.id,
                        email: sender.email,
                        displayName: sender.displayName
                    } : null,
                    createdAt: request.createdAt
                };
            })
        );

        return requestsWithDetails.filter(r => r.from !== null);
    }

    /**
     * Accept friend request
     */
    async acceptRequest(userId, requestId) {
        const requests = await this.storage.getFriendRequests(userId);
        const request = requests.find(r => r.id === requestId);
        
        if (!request) {
            throw new Error('Friend request not found');
        }

        await this.storage.acceptFriendRequest(requestId);
        
        return true;
    }

    /**
     * Remove friend
     */
    async removeFriend(userId, friendId) {
        const friends = await this.storage.getFriends(userId);
        if (!friends.some(f => f.id === friendId)) {
            throw new Error('This user is not your friend');
        }

        await this.storage.removeFriend(userId, friendId);
        
        return true;
    }

    /**
     * Get user's friends list
     */
    async getFriends(userId) {
        return await this.storage.getFriends(userId);
    }
}

module.exports = FriendsService;
