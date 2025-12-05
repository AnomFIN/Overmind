/**
 * Simple in-memory rate limiting middleware
 * 
 * Provides basic protection against abuse without external dependencies.
 * Note: This is suitable for self-hosted single-instance deployments.
 * For production multi-instance setups, use Redis-based rate limiting.
 */

// Store request counts per IP
const requestCounts = new Map();

// Clean up old entries every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts) {
        if (now - data.windowStart > 60000) {
            requestCounts.delete(key);
        }
    }
}, 60000);

/**
 * Create a rate limiting middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000)
 * @param {number} options.max - Maximum requests per window (default: 100)
 * @param {string} options.message - Error message when limit exceeded
 * @returns {Function} Express middleware
 */
export function rateLimit(options = {}) {
    const {
        windowMs = 60000,  // 1 minute
        max = 100,         // 100 requests per minute
        message = 'Too many requests, please try again later'
    } = options;
    
    return (req, res, next) => {
        // Get client IP (support proxied requests)
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const key = `${ip}:${req.path}`;
        const now = Date.now();
        
        let data = requestCounts.get(key);
        
        if (!data || now - data.windowStart > windowMs) {
            // Start new window
            data = { count: 1, windowStart: now };
            requestCounts.set(key, data);
        } else {
            data.count++;
        }
        
        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - data.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil((data.windowStart + windowMs) / 1000));
        
        if (data.count > max) {
            return res.status(429).json({ error: message });
        }
        
        next();
    };
}

// Pre-configured rate limiters for different use cases
export const apiLimiter = rateLimit({
    windowMs: 60000,
    max: 100,
    message: 'Too many API requests, please try again later'
});

export const uploadLimiter = rateLimit({
    windowMs: 60000,
    max: 20,
    message: 'Too many uploads, please try again later'
});

export const chatLimiter = rateLimit({
    windowMs: 60000,
    max: 30,
    message: 'Too many chat requests, please try again later'
});
