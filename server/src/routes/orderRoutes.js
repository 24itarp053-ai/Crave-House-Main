const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  getAdminOrders,
  getAdminOrderById,
  getOwnerOrders,
  getOwnerOrderById,
  updateOrderStatus,
  updateOrderPaymentStatus
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Secure all order routes under authentication
router.use(protect);

// Admin-specific routes
router.get('/admin', authorize('admin'), getAdminOrders);
router.get('/admin/:id', authorize('admin'), getAdminOrderById);

// Owner-specific routes
router.get('/owner', authorize('owner'), getOwnerOrders);
router.get('/owner/:id', authorize('owner'), getOwnerOrderById);

// Operational and payment status updates
router.patch('/:id/status', authorize('admin', 'owner'), updateOrderStatus);
router.patch('/:id/payment-status', authorize('admin'), updateOrderPaymentStatus);

// Customer-specific routes
router.post('/', authorize('customer'), createOrder);
router.get('/', authorize('customer'), getOrders);
router.get('/:id', authorize('customer'), getOrderById);

module.exports = router;
