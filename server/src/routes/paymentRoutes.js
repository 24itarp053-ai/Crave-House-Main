const express = require('express');
const router = express.Router();
const {
  createPaymentOrder,
  verifyPayment,
  handlePaymentFailure,
  getAdminPayments,
  handleWebhook
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public webhook endpoint (Called asynchronously by Razorpay; verified via HMAC-SHA256)
router.post('/webhook', handleWebhook);

// All subsequent customer & administrative payment endpoints require JWT authentication
router.use(protect);

// Customer payment endpoints
router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);
router.post('/failed', handlePaymentFailure);

// Admin & Owner payment inspection endpoint
router.get('/admin', authorize('admin', 'owner'), getAdminPayments);

module.exports = router;
