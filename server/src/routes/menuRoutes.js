const express = require('express');
const router = express.Router();
const {
  getMenuItems,
  getMenuItemsByCategory,
  getMenuItemById,
  getAdminMenuItems,
  createMenuItem,
  updateMenuItem,
  updateMenuItemAvailability,
  deleteMenuItem
} = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public read-only endpoints
router.get('/', getMenuItems);
router.get('/category/:slug', getMenuItemsByCategory);

// Protected admin/owner — must be BEFORE /:id to avoid route collision
router.get('/admin', protect, authorize('admin', 'owner'), getAdminMenuItems);

router.get('/:id', getMenuItemById);

// Protected menu management endpoints
router.post('/', protect, authorize('admin', 'owner'), createMenuItem);
router.put('/:id', protect, authorize('admin', 'owner'), updateMenuItem);
router.patch('/:id/availability', protect, authorize('admin', 'owner'), updateMenuItemAvailability);
router.delete('/:id', protect, authorize('admin'), deleteMenuItem);

module.exports = router;
