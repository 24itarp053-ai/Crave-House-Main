const express = require('express');
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  handlePaymentFailure,
  getAdminPayments
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All payment endpoints require user authentication
router.use(protect);

// Customer payment endpoints
router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);
router.post('/failed', handlePaymentFailure);

// Admin & Owner payment inspection endpoint
router.get('/admin', authorize('admin', 'owner'), getAdminPayments);

module.exports = router;
