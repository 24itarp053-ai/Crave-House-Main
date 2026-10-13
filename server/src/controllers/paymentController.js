const crypto = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const getRazorpayInstance = require('../config/razorpay');

/**
 * @desc    Create Razorpay Payment Order
 * @route   POST /api/payments/create-order
 * @access  Private (Customer)
 */
const createPaymentOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid Order ID is required'
      });
    }

    // Fetch order from database
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order belongs to the authenticated user
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized payment request'
      });
    }

    // Check if order has already been paid
    if (order.payment && order.payment.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'This order has already been paid'
      });
    }

    // Convert database order total to paise for Razorpay
    const amountInPaise = Math.round(order.pricing.total * 100);

    if (!amountInPaise || amountInPaise <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order total'
      });
    }

    // Initialize Razorpay instance
    const razorpay = getRazorpayInstance();

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${order._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`,
      notes: {
        orderId: order._id.toString(),
        userId: req.user.id
      }
    };

    // Create Razorpay Order
    const razorpayOrder = await razorpay.orders.create(options);

    // Save Payment document in MongoDB
    const payment = new Payment({
      order: order._id,
      user: req.user.id,
      razorpayOrderId: razorpayOrder.id,
      amount: order.pricing.total,
      currency: 'INR',
      method: 'online',
      status: 'Created'
    });

    await payment.save();

    // Return Razorpay order details to frontend (Do NOT send secret key)
    res.status(201).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: 'Payment order could not be created'
    });
  }
};

/**
 * @desc    Verify Razorpay Payment Signature Server-Side
 * @route   POST /api/payments/verify
 * @access  Private (Customer)
 */
const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Incomplete payment verification details'
      });
    }

    // Find Payment document by razorpayOrderId
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record does not exist'
      });
    }

    // Verify ownership
    if (payment.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized payment request'
      });
    }

    // Prevent duplicate processing if payment was already marked Paid (Idempotency)
    if (payment.status === 'Paid') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        payment
      });
    }

    // Server-side HMAC SHA256 Signature Verification
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const bodyToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyToSign)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      payment.status = 'Failed';
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Signature verified successfully — Update Payment record
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'Paid';
    await payment.save();

    // Update associated Order payment info
    const order = await Order.findById(payment.order);
    if (order) {
      order.payment.method = 'online';
      order.payment.status = 'Paid';
      order.payment.transactionId = razorpay_payment_id;
      await order.save();
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      payment,
      order
    });

  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
};

/**
 * @desc    Handle Razorpay Payment Failure/Cancellation
 * @route   POST /api/payments/failed
 * @access  Private (Customer)
 */
const handlePaymentFailure = async (req, res, next) => {
  try {
    const { razorpay_order_id, reason } = req.body;

    if (razorpay_order_id) {
      const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
      if (payment && payment.user.toString() === req.user.id && payment.status === 'Created') {
        payment.status = 'Failed';
        await payment.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Payment failure recorded'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all Payment transactions (Admin / Owner)
 * @route   GET /api/payments/admin
 * @access  Private (Admin / Owner)
 */
const getAdminPayments = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    let limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    if (limit > 50) limit = 50;

    const skip = (page - 1) * limit;

    const total = await Payment.countDocuments();
    const payments = await Payment.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email phone')
      .populate('order', 'orderNumber pricing status');

    res.status(200).json({
      success: true,
      count: payments.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      payments
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handlePaymentFailure,
  getAdminPayments
};
