const jwt = require('jsonwebtoken');

/**
 * ExamGenius AI - Authentication Middleware
 * Verifies JWT tokens and sets user context
 */

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. Please login to ExamGenius AI.',
        code: 'NO_TOKEN' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Set user context
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      isAdmin: decoded.isAdmin || false
    };

    // Log access in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 ExamGenius AI authenticated user:', decoded.email);
    }

    next();

  } catch (error) {
    console.error('❌ ExamGenius AI auth error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Your session has expired. Please login again.',
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid authentication token.',
        code: 'INVALID_TOKEN' 
      });
    }

    res.status(401).json({ 
      error: 'Authentication failed. Please try logging in again.',
      code: 'AUTH_ERROR' 
    });
  }
};

module.exports = auth;
