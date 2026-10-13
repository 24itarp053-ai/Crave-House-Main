const express = require('express');
const router = express.Router();
const { getAdminAnalytics, getOwnerAnalytics } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Route for admin analytics
router.get('/admin', protect, authorize('admin'), getAdminAnalytics);

// Route for owner analytics
router.get('/owner', protect, authorize('owner'), getOwnerAnalytics);

module.exports = router;
