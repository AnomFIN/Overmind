/**
 * Authentication Middleware
 * Protects sensitive endpoints from unauthorized access
 */

const crypto = require('crypto');

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @returns {boolean} - True if strings match
 */
function timingSafeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }
    
    // If lengths differ, return false (still do comparison to maintain constant time)
    if (a.length !== b.length) {
        // Use dummy comparison to maintain timing
        const dummyA = Buffer.from(a || 'x');
        const dummyB = Buffer.from(a || 'y'); // Same length as dummyA
        try {
            crypto.timingSafeEqual(dummyA, dummyB);
        } catch (e) {
            // Expected to throw
        }
        return false;
    }
    
    try {
        const bufferA = Buffer.from(a);
        const bufferB = Buffer.from(b);
        return crypto.timingSafeEqual(bufferA, bufferB);
    } catch (e) {
        return false;
    }
}

/**
 * Verify admin token for settings access
 * Checks for ADMIN_TOKEN in environment and Authorization header
 */
function requireAuth(req, res, next) {
    const adminToken = process.env.ADMIN_TOKEN;
    
    // If no admin token is configured, deny access with setup instructions
    if (!adminToken) {
        return res.status(503).json({
            error: 'Authentication not configured',
            message: 'Please set ADMIN_TOKEN in your .env file to secure the settings endpoint'
        });
    }
    
    // Check Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide an Authorization header with your admin token'
        });
    }
    
    // Support both "Bearer <token>" and direct token formats
    const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;
    
    // Verify token matches using constant-time comparison to prevent timing attacks
    if (!timingSafeEqual(token, adminToken)) {
        return res.status(403).json({
            error: 'Invalid credentials',
            message: 'The provided admin token is incorrect'
        });
    }
    
    // Token is valid, proceed
    next();
}

/**
 * Create authentication middleware
 * Verifies user sessions and protects routes
 */
function createAuthMiddleware(authService) {
    return async (req, res, next) => {
        try {
            // Get session token from cookie or Authorization header
            let token = req.cookies?.session;
            
            if (!token) {
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    token = authHeader.substring(7);
                }
            }

            if (!token) {
                return res.status(401).json({
                    error: 'Authentication required',
                    message: 'Please log in to access this resource'
                });
            }

            // Verify session
            const user = await authService.verifySession(token);
            
            if (!user) {
                return res.status(401).json({
                    error: 'Invalid or expired session',
                    message: 'Please log in again'
                });
            }

            // Attach user to request
            req.user = user;
            req.sessionToken = token;
            
            next();
        } catch (err) {
            console.error('[Auth Middleware] Error:', err);
            res.status(500).json({
                error: 'Authentication error',
                message: 'An error occurred while verifying your session'
            });
        }
    };
}

/**
 * Optional authentication middleware
 * Attaches user if authenticated but doesn't require it
 */
function createOptionalAuthMiddleware(authService) {
    return async (req, res, next) => {
        try {
            // Get session token from cookie or Authorization header
            let token = req.cookies?.session;
            
            if (!token) {
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    token = authHeader.substring(7);
                }
            }

            if (token) {
                const user = await authService.verifySession(token);
                if (user) {
                    req.user = user;
                    req.sessionToken = token;
                }
            }
            
            next();
        } catch (err) {
            console.error('[Optional Auth Middleware] Error:', err);
            next();
        }
    };
}

module.exports = {
    requireAuth,
    createAuthMiddleware,
    createOptionalAuthMiddleware
};
