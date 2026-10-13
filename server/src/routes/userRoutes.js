const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUser,
  changePassword
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

// 1. User profile routes (Any authenticated user role)
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

// 1.5. Change password route (Customer role only)
router.put('/change-password', protect, authorize('customer'), changePassword);

// 2. Admin user list (Pagination query supported)
router.get('/', protect, authorize('admin'), getUsers);

// 3. User details by ID (MongoDB ObjectID verification validated first)
router.get('/:id', protect, authorize('admin'), getUserById);

// 4. Update user details & role (Self-protection role checks enforced)
router.put('/:id', protect, authorize('admin'), updateUser);

// 5. Update user operational status (Self-deactivation checks enforced)
router.patch('/:id/status', protect, authorize('admin'), updateUserStatus);

module.exports = router;
