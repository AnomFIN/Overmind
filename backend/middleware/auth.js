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
};
