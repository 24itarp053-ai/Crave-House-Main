const crypto = require('crypto');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const getRazorpayInstance = require('../config/razorpay');
const { sendPaymentSuccess } = require('../services/emailService');

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

    // Verify Razorpay configuration before attempting online order creation
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const isConfigured = Boolean(
      keyId &&
      keySecret &&
      keyId !== 'rzp_test_xxxxxxxxx' &&
      keySecret !== 'xxxxxxxxxxxxxxxx'
    );

    if (!isConfigured) {
      return res.status(503).json({
        success: false,
        message: 'Online payment service is currently unavailable. Please select Cash on Delivery or another available payment method.'
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
      if (order.status === 'Pending') {
        order.status = 'Confirmed';
      }
      await order.save();

      // Send payment success notification (deduplicated against duplicate calls/webhooks)
      sendPaymentSuccess(order, payment).catch(err => {
        console.error('[PaymentController] Payment verification email warning:', err.message);
      });
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

const normalizePaymentMethod = (rawMethod) => {
  if (!rawMethod) return 'online';
  const m = String(rawMethod).toLowerCase();
  if (m === 'upi') return 'UPI';
  if (m === 'card') return 'Card';
  if (m === 'netbanking') return 'NetBanking';
  if (m === 'cod') return 'COD';
  if (m === 'wallet') return 'wallet';
  return 'online';
};

/**
 * @desc    Handle Razorpay Webhook Callbacks
 * @route   POST /api/payments/webhook
 * @access  Public (Signature Verified)
 */
const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // 1. Verify that the webhook secret is configured
    if (!webhookSecret) {
      console.error('⚠️ Razorpay webhook error: RAZORPAY_WEBHOOK_SECRET is not configured.');
      return res.status(500).json({
        success: false,
        message: 'Server webhook configuration error'
      });
    }

    // 2. Verify that signature header is provided
    if (!signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing X-Razorpay-Signature header'
      });
    }

    // 3. Extract raw body buffer
    const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {})));
    if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Missing or empty request body'
      });
    }

    // 4. Verify HMAC-SHA256 signature using timingSafeEqual
    const generatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const signatureBuf = Buffer.from(signature, 'utf8');
    const generatedBuf = Buffer.from(generatedSignature, 'utf8');

    if (signatureBuf.length !== generatedBuf.length || !crypto.timingSafeEqual(signatureBuf, generatedBuf)) {
      console.warn('⚠️ Razorpay webhook signature verification failed.');
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    // 5. Parse JSON payload safely
    let eventData;
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body) && req.body !== null) {
      eventData = req.body;
    } else {
      try {
        eventData = JSON.parse(rawBody.toString('utf8'));
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Malformed JSON payload'
        });
      }
    }

    const { event, payload } = eventData || {};
    if (!event || !payload) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook payload structure'
      });
    }

    // 6. Process successful payment events: payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload.payment?.entity;
      const orderEntity = payload.order?.entity;

      // Extract order and payment identifiers (support both payment.captured and order.paid structures)
      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
      const razorpayPaymentId = paymentEntity?.id || (orderEntity?.id ? `pay_order_${orderEntity.id.slice(-8)}` : undefined);
      const paymentMethod = normalizePaymentMethod(paymentEntity?.method);
      const payloadAmount = paymentEntity?.amount !== undefined ? paymentEntity.amount : orderEntity?.amount;
      const payloadCurrency = paymentEntity?.currency || orderEntity?.currency || 'INR';

      if (!razorpayOrderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing Razorpay order identifier in payload'
        });
      }

      // If event is order.paid, verify that the order entity status confirms payment
      if (event === 'order.paid' && orderEntity && orderEntity.status && orderEntity.status !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Order status does not indicate paid'
        });
      }

      // If event is payment.captured, verify that payment entity status confirms capture
      if (event === 'payment.captured' && paymentEntity && paymentEntity.status && paymentEntity.status !== 'captured') {
        return res.status(400).json({
          success: false,
          message: 'Payment status does not indicate captured'
        });
      }

      // Authoritative lookup: Find Payment record by razorpayOrderId
      let payment = await Payment.findOne({ razorpayOrderId });
      let order = payment ? await Order.findById(payment.order) : null;

      // Fallback lookup via notes.orderId only if payment record was not directly found
      if (!order) {
        const orderIdNote = orderEntity?.notes?.orderId || paymentEntity?.notes?.orderId;
        if (orderIdNote && mongoose.Types.ObjectId.isValid(orderIdNote)) {
          const potentialOrder = await Order.findById(orderIdNote);
          if (potentialOrder) {
            const potentialPayment = await Payment.findOne({ order: potentialOrder._id });
            // Strict security check: only adopt if Payment's razorpayOrderId matches or is not yet set
            if (!potentialPayment || potentialPayment.razorpayOrderId === razorpayOrderId) {
              order = potentialOrder;
              payment = potentialPayment;
            } else {
              console.warn(`Security warning: Mismatch between webhook razorpayOrderId (${razorpayOrderId}) and order Payment (${potentialPayment.razorpayOrderId})`);
              return res.status(400).json({
                success: false,
                message: 'Mismatched order and payment identifiers'
              });
            }
          }
        }
      }

      if (!order && !payment) {
        console.warn(`Webhook received for unknown Razorpay order: ${razorpayOrderId}`);
        return res.status(404).json({
          success: false,
          message: 'Matching order or payment record not found'
        });
      }

      const targetOrder = order || (payment ? await Order.findById(payment.order) : null);

      // 7. Strict Amount and Currency Verification
      if (payloadAmount === undefined || payloadAmount === null || typeof payloadAmount !== 'number' || payloadAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or missing payment amount in webhook payload'
        });
      }

      if (!payloadCurrency || payloadCurrency.toUpperCase() !== 'INR') {
        console.error(`Webhook currency mismatch: expected INR, received ${payloadCurrency}`);
        return res.status(400).json({
          success: false,
          message: 'Payment currency mismatch'
        });
      }

      if (targetOrder) {
        const expectedPaise = Math.round(targetOrder.pricing.total * 100);
        if (payloadAmount !== expectedPaise) {
          console.error(`Webhook amount mismatch for order ${targetOrder.orderNumber}: expected ${expectedPaise} paise, received ${payloadAmount} paise`);
          return res.status(400).json({
            success: false,
            message: 'Payment amount mismatch'
          });
        }
      }

      // 8. Idempotency Check: if already marked Paid, acknowledge without duplicate mutations
      if (
        (!payment || payment.status === 'Paid') &&
        (!targetOrder || targetOrder.payment?.status === 'Paid')
      ) {
        return res.status(200).json({
          status: 'ok',
          message: 'Duplicate event: payment already verified'
        });
      }

      // 9. Update Payment record
      if (payment) {
        payment.status = 'Paid';
        if (razorpayPaymentId) payment.razorpayPaymentId = razorpayPaymentId;
        if (paymentMethod) payment.method = paymentMethod;
        await payment.save();
      }

      // Update Order record
      if (targetOrder) {
        targetOrder.payment.method = paymentMethod || 'online';
        targetOrder.payment.status = 'Paid';
        if (razorpayPaymentId) targetOrder.payment.transactionId = razorpayPaymentId;
        // Advance status from Pending to Confirmed on verified payment
        if (targetOrder.status === 'Pending') {
          targetOrder.status = 'Confirmed';
        }
        await targetOrder.save();

        // Send payment success notification (deduplicated against client verify)
        sendPaymentSuccess(targetOrder, payment || {}).catch(err => {
          console.error('[PaymentWebhook] Payment webhook email warning:', err.message);
        });
      }

      console.log(`Payment confirmed via webhook: Order #${targetOrder?.orderNumber || razorpayOrderId}`);
      return res.status(200).json({
        status: 'ok',
        message: 'Payment reconciled successfully'
      });
    }

    // 10. Process payment.failed event
    if (event === 'payment.failed') {
      const paymentEntity = payload.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;
      const failureReason = paymentEntity?.error_description || 'Transaction declined';

      if (!razorpayOrderId) {
        return res.status(400).json({
          success: false,
          message: 'Missing order identifier in failed payment payload'
        });
      }

      const payment = await Payment.findOne({ razorpayOrderId });
      const targetOrder = payment ? await Order.findById(payment.order) : null;

      // Late failure protection: NEVER overwrite a previously confirmed Paid payment!
      if (payment && payment.status === 'Paid') {
        console.warn(`Ignoring late payment.failed event for already Paid payment (${razorpayOrderId})`);
        return res.status(200).json({
          status: 'ok',
          message: 'Ignored: payment is already marked as Paid'
        });
      }

      if (targetOrder && targetOrder.payment?.status === 'Paid') {
        console.warn(`Ignoring late payment.failed event for already Paid order (${targetOrder.orderNumber})`);
        return res.status(200).json({
          status: 'ok',
          message: 'Ignored: order payment is already marked as Paid'
        });
      }

      if (payment) {
        payment.status = 'Failed';
        if (razorpayPaymentId) payment.razorpayPaymentId = razorpayPaymentId;
        await payment.save();
      }

      if (targetOrder && targetOrder.payment?.status !== 'Paid') {
        targetOrder.payment.status = 'Failed';
        await targetOrder.save();
      }

      console.log(`Payment failure recorded via webhook: ${razorpayOrderId} (${failureReason})`);
      return res.status(200).json({
        status: 'ok',
        message: 'Payment failure recorded'
      });
    }

    // Acknowledge any other Razorpay events cleanly with 200
    return res.status(200).json({
      status: 'ok',
      message: `Event '${event}' acknowledged (no action taken)`
    });

  } catch (error) {
    console.error('Error processing Razorpay webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error processing webhook'
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handlePaymentFailure,
  getAdminPayments,
  handleWebhook
};
