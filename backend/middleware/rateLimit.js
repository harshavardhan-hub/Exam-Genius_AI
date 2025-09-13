const rateLimit = require('express-rate-limit');

/**
 * ExamGenius AI - Rate Limiting Configuration
 * Protects API endpoints from abuse
 */

// General API rate limiting
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs, // Time window
    max, // Limit each IP to max requests per windowMs
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
      type: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
    handler: (req, res) => {
      console.log(`🚨 ExamGenius AI rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        type: 'RATE_LIMIT_EXCEEDED'
      });
    }
  });
};

// Specific rate limiters
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // 10 attempts per window
  'Too many authentication attempts, please try again later.'
);

const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads per hour
  'Upload limit exceeded, please try again later.'
);

const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  1000, // 1000 requests per 15 minutes
  'API rate limit exceeded, please slow down your requests.'
);

const adminRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  200, // 200 admin requests per 15 minutes
  'Admin API rate limit exceeded.'
);

module.exports = {
  authRateLimit,
  uploadRateLimit,
  generalRateLimit,
  adminRateLimit,
  createRateLimit
};
