const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public read-only endpoints
router.get('/', getCategories);

// Protected management endpoints (registered before /:slug to avoid route conflicts)
router.post('/', protect, authorize('admin'), createCategory);
router.put('/:id', protect, authorize('admin'), updateCategory);
router.patch('/:id/status', protect, authorize('admin'), updateCategoryStatus);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

// Public slug lookup — kept last so it does not shadow the protected routes above
router.get('/:slug', getCategoryBySlug);

module.exports = router;

