/**
 * Authentication Routes
 * Handles user registration, login, logout
 */

const express = require('express');
const router = express.Router();

/**
 * Create auth router with dependencies
 */
function createAuthRouter(authService, storage, rateLimiters) {
    // POST /api/auth/register
    router.post('/register', rateLimiters.auth, async (req, res) => {
        try {
            const { username, email, password, displayName } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Username, email and password are required'
                });
            }

            const user = await authService.register(username, email, password, displayName);

            // Log audit
            await storage.logAudit({
                userId: user.id,
                action: 'register',
                resource: 'user',
                details: { username: user.username, email: user.email },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.status(201).json({
                success: true,
                message: 'Account created successfully',
                user
            });
        } catch (err) {
            console.error('[Auth] Registration error:', err.message);
            
            res.status(400).json({
                error: 'Registration failed',
                message: err.message
            });
        }
    });

    // POST /api/auth/login
    router.post('/login', rateLimiters.auth, async (req, res) => {
        try {
            const { usernameOrEmail, password } = req.body;

            if (!usernameOrEmail || !password) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Username/email and password are required'
                });
            }

            const { user, session } = await authService.login(usernameOrEmail, password);

            // Set secure cookie
            res.cookie('session', session.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Log audit
            await storage.logAudit({
                userId: user.id,
                action: 'login',
                resource: 'session',
                details: { username: user.username },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                message: 'Logged in successfully',
                user,
                session: {
                    expiresAt: session.expiresAt
                },
                requirePasswordChange: user.requirePasswordChange || false
            });
        } catch (err) {
            console.error('[Auth] Login error:', err.message);
            
            // Log failed login attempt
            try {
                await storage.logAudit({
                    action: 'login_failed',
                    resource: 'session',
                    details: { usernameOrEmail: req.body.usernameOrEmail, reason: err.message },
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            } catch (logErr) {
                console.error('[Auth] Failed to log audit:', logErr);
            }

            res.status(401).json({
                error: 'Login failed',
                message: err.message
            });
        }
    });

    // POST /api/auth/logout
    router.post('/logout', async (req, res) => {
        try {
            const token = req.cookies?.session || req.headers.authorization?.substring(7);

            if (token) {
                await authService.logout(token);
                
                // Log audit
                if (req.user) {
                    await storage.logAudit({
                        userId: req.user.id,
                        action: 'logout',
                        resource: 'session',
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent']
                    });
                }
            }

            res.clearCookie('session');

            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (err) {
            console.error('[Auth] Logout error:', err.message);
            
            res.status(500).json({
                error: 'Logout failed',
                message: 'An error occurred while logging out'
            });
        }
    });

    // GET /api/auth/me
    router.get('/me', async (req, res) => {
        try {
            const token = req.cookies?.session || req.headers.authorization?.substring(7);

            if (!token) {
                return res.status(401).json({
                    error: 'Not authenticated',
                    message: 'Please log in'
                });
            }

            const user = await authService.verifySession(token);

            if (!user) {
                res.clearCookie('session');
                return res.status(401).json({
                    error: 'Invalid session',
                    message: 'Please log in again'
                });
            }

            res.json({
                success: true,
                user
            });
        } catch (err) {
            console.error('[Auth] Get me error:', err.message);
            
            res.status(500).json({
                error: 'Failed to get user',
                message: 'An error occurred while fetching user data'
            });
        }
    });

    // PUT /api/auth/profile
    router.put('/profile', async (req, res) => {
        try {
            const token = req.cookies?.session || req.headers.authorization?.substring(7);

            if (!token) {
                return res.status(401).json({
                    error: 'Not authenticated',
                    message: 'Please log in'
                });
            }

            const currentUser = await authService.verifySession(token);

            if (!currentUser) {
                return res.status(401).json({
                    error: 'Invalid session',
                    message: 'Please log in again'
                });
            }

            const user = await authService.updateProfile(currentUser.id, req.body);

            // Log audit
            await storage.logAudit({
                userId: user.id,
                action: 'update_profile',
                resource: 'user',
                details: { updates: Object.keys(req.body) },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                message: 'Profile updated successfully',
                user
            });
        } catch (err) {
            console.error('[Auth] Update profile error:', err.message);
            
            res.status(500).json({
                error: 'Failed to update profile',
                message: err.message
            });
        }
    });

    // POST /api/auth/change-password
    router.post('/change-password', rateLimiters.auth, async (req, res) => {
        try {
            const token = req.cookies?.session || req.headers.authorization?.substring(7);

            if (!token) {
                return res.status(401).json({
                    error: 'Not authenticated',
                    message: 'Please log in'
                });
            }

            const currentUser = await authService.verifySession(token);

            if (!currentUser) {
                return res.status(401).json({
                    error: 'Invalid session',
                    message: 'Please log in again'
                });
            }

            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                return res.status(400).json({
                    error: 'Missing required fields',
                    message: 'Current and new password are required'
                });
            }

            await authService.changePassword(currentUser.id, oldPassword, newPassword);

            res.clearCookie('session');

            // Log audit
            await storage.logAudit({
                userId: currentUser.id,
                action: 'change_password',
                resource: 'user',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            res.json({
                success: true,
                message: 'Password changed successfully. Please log in again.'
            });
        } catch (err) {
            console.error('[Auth] Change password error:', err.message);
            
            res.status(400).json({
                error: 'Failed to change password',
                message: err.message
            });
        }
    });

    return router;
}

module.exports = createAuthRouter;
