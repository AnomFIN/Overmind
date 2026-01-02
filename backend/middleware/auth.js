/**
 * Authentication Middleware
 * Protects sensitive endpoints from unauthorized access
 */

const crypto = require('crypto');

/**
 * Constant-time string comparison to prevent timing attacks
 * Uses crypto.timingSafeEqual with proper length handling
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @returns {boolean} - True if strings match
 */
function timingSafeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }
    
    // Convert strings to buffers
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');
    
    // If lengths differ, pad the shorter buffer to maintain constant time
    // This prevents timing attacks based on length differences
    if (bufferA.length !== bufferB.length) {
        // Create equal-length buffers for constant-time comparison
        const maxLength = Math.max(bufferA.length, bufferB.length);
        const paddedA = Buffer.alloc(maxLength);
        const paddedB = Buffer.alloc(maxLength);
        
        bufferA.copy(paddedA);
        bufferB.copy(paddedB);
        
        try {
            // This will return false due to different original lengths
            // but maintains constant time
            crypto.timingSafeEqual(paddedA, paddedB);
        } catch (e) {
            // If an error occurs, the comparison failed
        }
        return false;
    }
    
    try {
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
