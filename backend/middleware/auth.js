/**
 * Authentication Middleware
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
