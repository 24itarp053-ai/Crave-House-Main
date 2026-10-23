const express = require('express');
const router = express.Router();
const {
  getCategories,
  getAdminCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public read-only endpoints
router.get('/', getCategories);

// Protected admin/owner management endpoints (registered before /:slug to avoid route shadowing)
router.get('/admin', protect, authorize('admin', 'owner'), getAdminCategories);
router.post('/', protect, authorize('admin', 'owner'), createCategory);
router.put('/:id', protect, authorize('admin', 'owner'), updateCategory);
router.patch('/:id/status', protect, authorize('admin', 'owner'), updateCategoryStatus);
router.delete('/:id', protect, authorize('admin', 'owner'), deleteCategory);

// Public slug lookup — kept last so it does not shadow administrative routes
router.get('/:slug', getCategoryBySlug);

module.exports = router;
