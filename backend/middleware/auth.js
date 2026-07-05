/**
 * Authentication Middleware
 * Protects routes that require authentication
 */

/**
 * Require authentication - redirects or returns 401
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    // API request - return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }
    // Browser request - redirect to login
    return res.redirect('/login.html');
  }
  next();
};

/**
 * Optional auth - attaches user to req if logged in, but doesn't block
 */
const optionalAuth = (req, res, next) => {
  // Just proceed; session data is available if present
  next();
};

/**
 * Guest only - redirect authenticated users to feed
 */
const guestOnly = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/feed.html');
  }
  next();
};

module.exports = { requireAuth, optionalAuth, guestOnly };
