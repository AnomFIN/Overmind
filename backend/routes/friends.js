/**
 * Friends Routes
 * Handles friend requests and friendships
 */

const express = require('express');
const router = express.Router();

/**
 * Create friends router with dependencies
 */
function createFriendsRouter(friendsService, storage, authMiddleware, rateLimiters) {
    // All routes require authentication
    router.use(authMiddleware);

    // GET /api/friends
    // Get user's friends list
    router.get('/', async (req, res) => {
        try {
            const friends = await friendsService.getFriends(req.user.id);

            res.json({
                success: true,
                friends
            });
        } catch (err) {
            console.error('[Friends] Get friends error:', err.message);
            
            res.status(500).json({
                error: 'Failed to get friends',
                message: 'An error occurred while fetching your friends list'
            });
        }
    });

    // GET /api/friends/requests
    // Get pending friend requests
    router.get('/requests', async (req, res) => {
        try {
            const requests = await friendsService.getRequests(req.user.id);

            res.json({
                success: true,
                requests
            });
        } catch (err) {
            console.error('[Friends] Get requests error:', err.message);
            
            res.status(500).json({
                error: 'Failed to get friend requests',
                message: 'An error occurred while fetching friend requests'
            });
        }
    });

    // POST /api/friends/request
    // Send friend request
    router.post('/request', rateLimiters.api, async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    error: 'Missing required field',
                    message: 'Email is required'
                });
            }

            const request = await friendsService.sendRequest(req.user.id, email);

            // Log audit
            await storage.logAudit({
                userId: req.user.id,
                action: 'send_friend_request',
                resource: 'friend_request',
                details: { toEmail: email, requestId: request.id },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                message: 'Friend request sent',
                request
            });
        } catch (err) {
            console.error('[Friends] Send request error:', err.message);
            
            res.status(400).json({
                error: 'Failed to send friend request',
                message: err.message
            });
        }
    });

    // POST /api/friends/accept
    // Accept friend request
    router.post('/accept', rateLimiters.api, async (req, res) => {
        try {
            const { requestId } = req.body;

            if (!requestId) {
                return res.status(400).json({
                    error: 'Missing required field',
                    message: 'Request ID is required'
                });
            }

            await friendsService.acceptRequest(req.user.id, requestId);

            // Log audit
            await storage.logAudit({
                userId: req.user.id,
                action: 'accept_friend_request',
                resource: 'friend_request',
                details: { requestId },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                message: 'Friend request accepted'
            });
        } catch (err) {
            console.error('[Friends] Accept request error:', err.message);
            
            res.status(400).json({
                error: 'Failed to accept friend request',
                message: err.message
            });
        }
    });

    // DELETE /api/friends/:friendId
    // Remove friend
    router.delete('/:friendId', rateLimiters.api, async (req, res) => {
        try {
            const { friendId } = req.params;

            await friendsService.removeFriend(req.user.id, friendId);

            // Log audit
            await storage.logAudit({
                userId: req.user.id,
                action: 'remove_friend',
                resource: 'friendship',
                details: { friendId },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                message: 'Friend removed'
            });
        } catch (err) {
            console.error('[Friends] Remove friend error:', err.message);
            
            res.status(400).json({
                error: 'Failed to remove friend',
                message: err.message
            });
        }
    });

    return router;
}

module.exports = createFriendsRouter;
