const User = require('../models/User');
const { verifyToken } = require('../utils/jwt');

/**
 * Protect routes - authenticate token, verify existence, and check active status
 */
const protect = async (req, res, next) => {
  let token;

  // Check for Bearer token in authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  try {
    const decoded = verifyToken(token);

    // Look up user in database to ensure account still exists and is active
    const user = await User.findById(decoded.userId).select('status role');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists'
      });
    }

    if (user.status && user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
    }

    // Attach verified user metadata to request
    req.user = {
      id: user._id.toString(),
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Restrict access - authorize users possessing specified roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authorize
};
