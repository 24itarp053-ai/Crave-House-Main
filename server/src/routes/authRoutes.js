const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Authenticated routes
router.get('/profile', protect, getProfile);

// Admin-only test endpoint
router.get('/admin-test', protect, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin access granted'
  });
});

// Owner-only test endpoint
router.get('/owner-test', protect, authorize('owner'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Owner access granted'
  });
});

module.exports = router;
