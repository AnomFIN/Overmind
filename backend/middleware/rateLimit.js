/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting request rates
 */

class RateLimiter {
    constructor() {
        this.requests = new Map();
    }

    /**
     * Create rate limit middleware
     * @param {Object} options - Rate limit options
     * @param {number} options.windowMs - Time window in milliseconds
     * @param {number} options.max - Maximum requests per window
     * @param {string} options.message - Error message
     */
    create(options = {}) {
        const {
            windowMs = 60 * 1000, // 1 minute
            max = 60, // 60 requests per minute
            message = 'Too many requests, please try again later',
            keyGenerator = (req) => req.ip || req.connection.remoteAddress
        } = options;

        return (req, res, next) => {
            const key = keyGenerator(req);
            const now = Date.now();
            
            // Clean up old entries
            this.cleanup(now, windowMs);

            // Get or create request log for this key
            if (!this.requests.has(key)) {
                this.requests.set(key, []);
            }

            const requests = this.requests.get(key);
            
            // Remove requests outside the window
            const validRequests = requests.filter(time => now - time < windowMs);
            
            if (validRequests.length >= max) {
                return res.status(429).json({
                    error: 'Rate limit exceeded',
                    message,
                    retryAfter: Math.ceil((validRequests[0] + windowMs - now) / 1000)
                });
            }

            // Add current request
            validRequests.push(now);
            this.requests.set(key, validRequests);

            // Add rate limit headers
            res.setHeader('X-RateLimit-Limit', max);
            res.setHeader('X-RateLimit-Remaining', max - validRequests.length);
            res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

            next();
        };
    }

    /**
     * Clean up old entries to prevent memory leaks
     */
    cleanup(now, windowMs) {
        for (const [key, requests] of this.requests.entries()) {
            const validRequests = requests.filter(time => now - time < windowMs);
            if (validRequests.length === 0) {
                this.requests.delete(key);
            } else {
                this.requests.set(key, validRequests);
            }
        }
    }

    /**
     * Reset rate limit for a specific key
     */
    reset(key) {
        this.requests.delete(key);
    }

    /**
     * Clear all rate limits
     */
    resetAll() {
        this.requests.clear();
    }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Preset configurations
const presets = {
    // Strict rate limit for login/register
    auth: rateLimiter.create({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts
        message: 'Too many authentication attempts. Please try again in 15 minutes.'
    }),

    // Moderate rate limit for API endpoints
    api: rateLimiter.create({
        windowMs: 60 * 1000, // 1 minute
        max: 60, // 60 requests
        message: 'Too many requests. Please slow down.'
    }),

    // Lenient rate limit for public endpoints
    public: rateLimiter.create({
        windowMs: 60 * 1000, // 1 minute
        max: 120, // 120 requests
        message: 'Too many requests. Please try again shortly.'
    }),

    // Strict rate limit for chat messages
    chat: rateLimiter.create({
        windowMs: 60 * 1000, // 1 minute
        max: 30, // 30 messages per minute
        message: 'You are sending messages too quickly. Please slow down.'
    }),

    // Moderate rate limit for file uploads
    upload: rateLimiter.create({
        windowMs: 60 * 1000, // 1 minute
        max: 10, // 10 uploads per minute
        message: 'Too many file uploads. Please wait before uploading more files.'
    })
};

module.exports = {
    RateLimiter,
    rateLimiter,
    ...presets
};
