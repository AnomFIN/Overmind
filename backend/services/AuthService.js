/**
 * Authentication Service
 * Handles user registration, login, and session management
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class AuthService {
    constructor(storageAdapter) {
        this.storage = storageAdapter;
    }

    /**
     * Hash password using bcrypt
     * Uses 12 rounds for strong security
     */
    async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Verify password against hash
     */
    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Generate secure session token
     */
    generateSessionToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Register new user
     */
    async register(username, email, password, displayName = null, role = 'user') {
        // Validate username
        if (!username || username.length < 3) {
            throw new Error('Username must be at least 3 characters long');
        }

        // Validate email
        if (!email || !email.includes('@')) {
            throw new Error('Invalid email address');
        }

        // Validate password
        if (!password || password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }

        // Check if user already exists by email
        const existingEmail = await this.storage.getUserByEmail(email);
        if (existingEmail) {
            throw new Error('User with this email already exists');
        }

        // Check if username already exists
        const existingUsername = await this.storage.getUserByUsername(username);
        if (existingUsername) {
            throw new Error('Username already taken');
        }

        // Hash password
        const passwordHash = await this.hashPassword(password);

        // Create user
        const user = await this.storage.createUser({
            username,
            email,
            passwordHash,
            displayName: displayName || username,
            role: role,
            requirePasswordChange: false
        });

        // Remove sensitive data from response
        delete user.passwordHash;
        
        return user;
    }

    /**
     * Login user (supports email or username)
     */
    async login(usernameOrEmail, password) {
        // Try to get user by email first, then username
        let user = await this.storage.getUserByEmail(usernameOrEmail);
        if (!user) {
            user = await this.storage.getUserByUsername(usernameOrEmail);
        }
        
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Verify password
        const valid = await this.verifyPassword(password, user.passwordHash);
        if (!valid) {
            throw new Error('Invalid email or password');
        }

        // Create session
        const token = this.generateSessionToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        const session = await this.storage.createSession({
            userId: user.id,
            token,
            expiresAt: expiresAt.toISOString()
        });

        // Remove sensitive data from response
        delete user.passwordHash;

        return {
            user,
            session: {
                token: session.token,
                expiresAt: session.expiresAt
            }
        };
    }

    /**
     * Logout user
     */
    async logout(sessionToken) {
        await this.storage.deleteSession(sessionToken);
        return true;
    }

    /**
     * Verify session and get user
     */
    async verifySession(sessionToken) {
        if (!sessionToken) {
            return null;
        }

        const session = await this.storage.getSession(sessionToken);
        if (!session) {
            return null;
        }

        const user = await this.storage.getUserById(session.userId);
        if (!user) {
            await this.storage.deleteSession(sessionToken);
            return null;
        }

        // Remove sensitive data
        delete user.passwordHash;

        return user;
    }

    /**
     * Get user by ID
     */
    async getUser(userId) {
        const user = await this.storage.getUserById(userId);
        if (user) {
            delete user.passwordHash;
        }
        return user;
    }

    /**
     * Update user profile
     */
    async updateProfile(userId, updates) {
        // Don't allow updating sensitive fields directly
        const allowedFields = ['displayName', 'bio', 'avatar'];
        const filteredUpdates = {};
        
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        }

        const user = await this.storage.updateUser(userId, filteredUpdates);
        if (user) {
            delete user.passwordHash;
        }
        return user;
    }

    /**
     * Change password
     */
    async changePassword(userId, oldPassword, newPassword) {
        const user = await this.storage.getUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Verify old password
        const valid = await this.verifyPassword(oldPassword, user.passwordHash);
        if (!valid) {
            throw new Error('Invalid current password');
        }

        // Validate new password
        if (!newPassword || newPassword.length < 8) {
            throw new Error('New password must be at least 8 characters long');
        }

        // Hash new password
        const passwordHash = await this.hashPassword(newPassword);

        // Update user
        await this.storage.updateUser(userId, { passwordHash });

        // Invalidate all existing sessions
        await this.storage.deleteUserSessions(userId);

        return true;
    }
}

module.exports = AuthService;
