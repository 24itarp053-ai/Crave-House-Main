const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token containing userId and role
 */
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id || user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Verify a JWT token and decode its payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken
};
