/**
 * Authentication Middleware
 * Protects sensitive endpoints from unauthorized access
 */

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
    
    // Verify token matches
    if (token !== adminToken) {
        return res.status(403).json({
            error: 'Invalid credentials',
            message: 'The provided admin token is incorrect'
        });
    }
    
    // Token is valid, proceed
    next();
}

module.exports = {
    requireAuth
 * Verifies user sessions and protects routes
 */

/**
 * Create authentication middleware
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
    createAuthMiddleware,
    createOptionalAuthMiddleware
};
