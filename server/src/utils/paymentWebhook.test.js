/**
 * paymentWebhook.test.js
 * Automated integration test suite for Razorpay Webhook & Payment Reliability in Crave House.
 *
 * Verifies:
 * 1. Missing signature header rejected (HTTP 400)
 * 2. Invalid signature rejected (HTTP 400)
 * 3. Malformed payload rejected safely (HTTP 400)
 * 4. Unknown / unmatched payment identifiers do not mark any order paid (HTTP 404)
 * 5. Amount & currency mismatch rejected safely (HTTP 400)
 * 6. Successful payment reconciles the correct order (HTTP 200, status marked Paid & Confirmed)
 * 7. Duplicate event handled idempotently (HTTP 200 without duplicate updates)
 * 8. Failed payment does NOT overwrite previously confirmed successful payment (Late failure protection)
 * 9. Legitimate payment failure on a pending order records Failure correctly
 * 10. Existing payment verification endpoint and COD checkout continue working
 */

const http = require('http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configure dedicated test webhook secret if not already set
const TEST_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_wh_secret_key_98765';
process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

// Ensure test key secret for customer verification test
if (!process.env.RAZORPAY_KEY_SECRET) {
  process.env.RAZORPAY_KEY_SECRET = 'test_key_secret_12345';
}

const app = require('../server');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crave_house';

let server;
let baseUrl;
const testRunId = Date.now();
const createdUserIds = [];
const createdOrderIds = [];
const createdPaymentIds = [];

const results = [];

function assertTest(title, condition, detail = '') {
  results.push({ title, pass: Boolean(condition), detail });
  const status = condition ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  [${status}] ${title} ${detail ? `(${detail})` : ''}`);
}

async function sendWebhookRequest(body, signatureOverride = null, secret = TEST_WEBHOOK_SECRET) {
  const rawString = typeof body === 'string' ? body : JSON.stringify(body);
  const signature = signatureOverride !== null
    ? signatureOverride
    : crypto.createHmac('sha256', secret).update(Buffer.from(rawString, 'utf8')).digest('hex');

  const headers = {
    'Content-Type': 'application/json'
  };
  if (signature !== false) {
    headers['x-razorpay-signature'] = signature;
  }

  const response = await fetch(`${baseUrl}/api/payments/webhook`, {
    method: 'POST',
    headers,
    body: rawString
  });

  let data;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  return { status: response.status, data };
}

async function runWebhookSuite() {
  console.log('\n======================================================');
  console.log('   CRAVE HOUSE: RAZORPAY WEBHOOK & PAYMENT TEST SUITE ');
  console.log('======================================================\n');

  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoURI);
    }
    console.log('Connected to MongoDB.\n');

    server = app.listen(0);
    await new Promise(resolve => server.on('listening', resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(`Ephemeral test server listening on ${baseUrl}\n`);

    // Setup base user, category, and menuItem
    const testUser = await User.create({
      name: `Webhook Customer ${testRunId}`,
      email: `wh-cust-${testRunId}@example.com`,
      password: 'Password123',
      phone: '9876543200',
      role: 'customer',
      status: 'Active'
    });
    createdUserIds.push(testUser._id);

    // Get user token for existing endpoint tests
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `wh-cust-${testRunId}@example.com`, password: 'Password123' })
    });
    const loginData = await loginRes.json();
    const userToken = loginData.token;

    let testCategory = await Category.findOne({ isActive: true });
    if (!testCategory) {
      testCategory = await Category.create({
        name: `WH Category ${testRunId}`,
        slug: `wh-cat-${testRunId}`,
        description: 'Test category',
        isActive: true
      });
    }

    let testItem = await MenuItem.findOne({ isAvailable: true });
    if (!testItem) {
      testItem = await MenuItem.create({
        name: `WH Pizza ${testRunId}`,
        slug: `wh-pizza-${testRunId}`,
        price: 399,
        image: 'test-wh.jpg',
        description: 'Test webhook pizza',
        category: testCategory._id,
        isAvailable: true
      });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 1: Webhook Security & Signature Verification
    // ──────────────────────────────────────────────────────────────────────────
    console.log('--- 1. Signature Verification & Malformed Payloads ---');

    // 1.1 Missing Signature
    const missingSigRes = await sendWebhookRequest({ event: 'payment.captured' }, false);
    assertTest(
      'Missing X-Razorpay-Signature header rejected with HTTP 400',
      missingSigRes.status === 400 && missingSigRes.data?.success === false,
      `Status: ${missingSigRes.status}`
    );

    // 1.2 Invalid Signature
    const invalidSigRes = await sendWebhookRequest(
      { event: 'payment.captured' },
      'invalid_signature_hex_1234567890abcdef'
    );
    assertTest(
      'Forged/tampered signature rejected with HTTP 400',
      invalidSigRes.status === 400 && invalidSigRes.data?.success === false,
      `Status: ${invalidSigRes.status}`
    );

    // 1.3 Signature signed with incorrect secret
    const wrongSecretRes = await sendWebhookRequest(
      { event: 'payment.captured' },
      null,
      'completely_wrong_secret_key_abc'
    );
    assertTest(
      'Signature signed with mismatched secret rejected with HTTP 400',
      wrongSecretRes.status === 400,
      `Status: ${wrongSecretRes.status}`
    );

    // 1.4 Malformed JSON with valid signature
    const malformedRaw = '{ "event": "payment.captured", "payload": { broken json ';
    const malformedSig = crypto.createHmac('sha256', TEST_WEBHOOK_SECRET).update(Buffer.from(malformedRaw, 'utf8')).digest('hex');
    const malformedRes = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': malformedSig
      },
      body: malformedRaw
    });
    assertTest(
      'Malformed JSON payload rejected safely with HTTP 400',
      malformedRes.status === 400,
      `Status: ${malformedRes.status}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 2: Identifier & Amount/Currency Validation
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. Identifier Matching & Amount/Currency Safeguards ---');

    // 2.1 Unknown / Unmatched Order ID
    const unknownRes = await sendWebhookRequest({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_unknown_123',
            order_id: 'order_nonexistent_99999999',
            amount: 50000,
            currency: 'INR'
          }
        }
      }
    });
    assertTest(
      'Unmatched Razorpay order identifier returns HTTP 404',
      unknownRes.status === 404,
      `Status: ${unknownRes.status}`
    );

    // Create Order & Payment for Amount Mismatch Test
    const mismatchOrder = await Order.create({
      user: testUser._id,
      orderNumber: `CH-MM-${testRunId}`,
      customer: { name: testUser.name, email: testUser.email, phone: testUser.phone },
      orderType: 'delivery',
      address: { address: '123 Test St', city: 'Test City', pincode: '123456' },
      items: [{ menuItem: testItem._id, name: testItem.name, image: testItem.image, price: 300, quantity: 1, subtotal: 300 }],
      pricing: { subtotal: 300, tax: 0, deliveryFee: 0, discount: 0, total: 300 }, // Expected: 30000 paise
      payment: { method: 'online', status: 'Pending' },
      status: 'Pending'
    });
    createdOrderIds.push(mismatchOrder._id);

    const mismatchRzpId = `order_mismatch_${testRunId}`;
    const mismatchPayment = await Payment.create({
      order: mismatchOrder._id,
      user: testUser._id,
      razorpayOrderId: mismatchRzpId,
      amount: 300,
      currency: 'INR',
      method: 'online',
      status: 'Created'
    });
    createdPaymentIds.push(mismatchPayment._id);

    // 2.2 Amount Mismatch (e.g. 100 paise instead of 30000 paise)
    const amountMismatchRes = await sendWebhookRequest({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_mm_001',
            order_id: mismatchRzpId,
            amount: 100, // 1 INR instead of 300 INR
            currency: 'INR'
          }
        }
      }
    });
    assertTest(
      'Amount mismatch rejected with HTTP 400',
      amountMismatchRes.status === 400 && amountMismatchRes.data?.message?.includes('amount mismatch'),
      `Status: ${amountMismatchRes.status}`
    );
    const orderAfterAmountMismatch = await Order.findById(mismatchOrder._id);
    assertTest(
      'Order payment status remains Pending after amount mismatch',
      orderAfterAmountMismatch.payment.status === 'Pending'
    );

    // 2.3 Currency Mismatch (e.g. USD instead of INR)
    const currencyMismatchRes = await sendWebhookRequest({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_curr_001',
            order_id: mismatchRzpId,
            amount: 30000,
            currency: 'USD'
          }
        }
      }
    });
    assertTest(
      'Currency mismatch rejected with HTTP 400',
      currencyMismatchRes.status === 400 && currencyMismatchRes.data?.message?.includes('currency mismatch'),
      `Status: ${currencyMismatchRes.status}`
    );

    // 2.4 Missing / Undefined Amount in Payload
    const missingAmountRes = await sendWebhookRequest({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_no_amt_001',
            order_id: mismatchRzpId,
            currency: 'INR'
            // amount field omitted
          }
        }
      }
    });
    assertTest(
      'Missing or undefined payment amount rejected with HTTP 400',
      missingAmountRes.status === 400 && missingAmountRes.data?.message?.includes('Invalid or missing payment amount'),
      `Status: ${missingAmountRes.status}`
    );

    // 2.5 Non-Positive Amount in Payload (e.g. 0 or negative)
    const zeroAmountRes = await sendWebhookRequest({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_zero_amt_001',
            order_id: mismatchRzpId,
            amount: 0,
            currency: 'INR'
          }
        }
      }
    });
    assertTest(
      'Zero or negative payment amount rejected with HTTP 400',
      zeroAmountRes.status === 400 && zeroAmountRes.data?.message?.includes('Invalid or missing payment amount'),
      `Status: ${zeroAmountRes.status}`
    );

    // 2.6 Mismatched identifier via notes.orderId pointing to an order with a different razorpayOrderId
    const mismatchedNotesRes = await sendWebhookRequest({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_tamper_001',
            order_id: 'order_forged_order_id_99999',
            amount: 30000,
            currency: 'INR',
            notes: {
              orderId: mismatchOrder._id.toString()
            }
          }
        }
      }
    });
    assertTest(
      'Mismatched webhook order_id and order Payment identifier rejected with HTTP 400',
      mismatchedNotesRes.status === 400 && mismatchedNotesRes.data?.message?.includes('Mismatched order and payment identifiers'),
      `Status: ${mismatchedNotesRes.status}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 3: Successful Reconciliation & Idempotency
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. Successful Reconciliation & Idempotency ---');

    // Create target Order & Payment for Successful Reconciliation
    const successOrder = await Order.create({
      user: testUser._id,
      orderNumber: `CH-SUCC-${testRunId}`,
      customer: { name: testUser.name, email: testUser.email, phone: testUser.phone },
      orderType: 'delivery',
      address: { address: '456 Gourmet Way', city: 'Test City', pincode: '654321' },
      items: [{ menuItem: testItem._id, name: testItem.name, image: testItem.image, price: 450, quantity: 1, subtotal: 450 }],
      pricing: { subtotal: 450, tax: 0, deliveryFee: 0, discount: 0, total: 450 }, // 45000 paise
      payment: { method: 'online', status: 'Pending' },
      status: 'Pending'
    });
    createdOrderIds.push(successOrder._id);

    const successRzpOrderId = `order_succ_${testRunId}`;
    const successPayment = await Payment.create({
      order: successOrder._id,
      user: testUser._id,
      razorpayOrderId: successRzpOrderId,
      amount: 450,
      currency: 'INR',
      method: 'online',
      status: 'Created'
    });
    createdPaymentIds.push(successPayment._id);

    // 3.1 Send payment.captured webhook
    const captureRes = await sendWebhookRequest({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_succ_wh_${testRunId}`,
            order_id: successRzpOrderId,
            amount: 45000,
            currency: 'INR',
            method: 'upi'
          }
        }
      }
    });
    assertTest(
      'payment.captured webhook processed with HTTP 200',
      captureRes.status === 200 && captureRes.data?.status === 'ok',
      `Status: ${captureRes.status}`
    );

    const updatedOrder = await Order.findById(successOrder._id);
    const updatedPayment = await Payment.findById(successPayment._id);

    assertTest(
      'Order payment.status is updated to "Paid"',
      updatedOrder.payment.status === 'Paid'
    );
    assertTest(
      'Order status advanced from "Pending" to "Confirmed"',
      updatedOrder.status === 'Confirmed'
    );
    assertTest(
      'Order payment transactionId and method recorded from webhook',
      updatedOrder.payment.transactionId === `pay_succ_wh_${testRunId}` &&
      (updatedOrder.payment.method === 'UPI' || updatedOrder.payment.method === 'upi')
    );
    assertTest(
      'Payment model status updated to "Paid"',
      updatedPayment.status === 'Paid' && updatedPayment.razorpayPaymentId === `pay_succ_wh_${testRunId}`
    );

    // 3.2 Duplicate Delivery Idempotency Check
    const duplicateRes = await sendWebhookRequest({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_succ_wh_${testRunId}`,
            order_id: successRzpOrderId,
            amount: 45000,
            currency: 'INR',
            method: 'upi'
          }
        }
      }
    });
    assertTest(
      'Duplicate webhook delivery returns HTTP 200 without error',
      duplicateRes.status === 200 && duplicateRes.data?.message?.includes('already verified'),
      `Status: ${duplicateRes.status}`
    );

    // 3.3 order.paid Event Handling (with order.entity & payment.entity)
    const orderPaidOrder = await Order.create({
      user: testUser._id,
      orderNumber: `CH-ORDPAID-${testRunId}`,
      customer: { name: testUser.name, email: testUser.email, phone: testUser.phone },
      orderType: 'delivery',
      address: { address: '123 Order Paid St', city: 'Test City', pincode: '123456' },
      items: [{ menuItem: testItem._id, name: testItem.name, image: testItem.image, price: 500, quantity: 1, subtotal: 500 }],
      pricing: { subtotal: 500, tax: 0, deliveryFee: 0, discount: 0, total: 500 }, // 50000 paise
      payment: { method: 'online', status: 'Pending' },
      status: 'Pending'
    });
    createdOrderIds.push(orderPaidOrder._id);

    const orderPaidRzpOrderId = `order_op_${testRunId}`;
    const orderPaidPayment = await Payment.create({
      order: orderPaidOrder._id,
      user: testUser._id,
      razorpayOrderId: orderPaidRzpOrderId,
      amount: 500,
      currency: 'INR',
      method: 'online',
      status: 'Created'
    });
    createdPaymentIds.push(orderPaidPayment._id);

    const orderPaidRes = await sendWebhookRequest({
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: orderPaidRzpOrderId,
            amount: 50000,
            amount_paid: 50000,
            currency: 'INR',
            status: 'paid'
          }
        },
        payment: {
          entity: {
            id: `pay_op_${testRunId}`,
            order_id: orderPaidRzpOrderId,
            amount: 50000,
            currency: 'INR',
            status: 'captured',
            method: 'card'
          }
        }
      }
    });
    assertTest(
      'order.paid event processed successfully with HTTP 200',
      orderPaidRes.status === 200 && orderPaidRes.data?.status === 'ok',
      `Status: ${orderPaidRes.status}`
    );
    const updatedOrderPaid = await Order.findById(orderPaidOrder._id);
    const updatedPaymentPaid = await Payment.findById(orderPaidPayment._id);
    assertTest(
      'Order reconciled via order.paid: status Confirmed and payment Paid',
      updatedOrderPaid.status === 'Confirmed' && updatedOrderPaid.payment.status === 'Paid' && updatedOrderPaid.payment.transactionId === `pay_op_${testRunId}`
    );
    assertTest(
      'Payment reconciled via order.paid: status Paid and transaction ID updated',
      updatedPaymentPaid.status === 'Paid' && updatedPaymentPaid.razorpayPaymentId === `pay_op_${testRunId}`
    );

    // 3.4 order.paid with ONLY order entity (payload.payment omitted)
    const orderOnlyOrder = await Order.create({
      user: testUser._id,
      orderNumber: `CH-ORDONLY-${testRunId}`,
      customer: { name: testUser.name, email: testUser.email, phone: testUser.phone },
      orderType: 'pickup',
      items: [{ menuItem: testItem._id, name: testItem.name, image: testItem.image, price: 350, quantity: 1, subtotal: 350 }],
      pricing: { subtotal: 350, tax: 0, deliveryFee: 0, discount: 0, total: 350 }, // 35000 paise
      payment: { method: 'online', status: 'Pending' },
      status: 'Pending'
    });
    createdOrderIds.push(orderOnlyOrder._id);

    const orderOnlyRzpOrderId = `order_only_${testRunId}`;
    const orderOnlyPayment = await Payment.create({
      order: orderOnlyOrder._id,
      user: testUser._id,
      razorpayOrderId: orderOnlyRzpOrderId,
      amount: 350,
      currency: 'INR',
      method: 'online',
      status: 'Created'
    });
    createdPaymentIds.push(orderOnlyPayment._id);

    const orderOnlyRes = await sendWebhookRequest({
      event: 'order.paid',
      payload: {
        order: {
          entity: {
            id: orderOnlyRzpOrderId,
            amount: 35000,
            amount_paid: 35000,
            currency: 'INR',
            status: 'paid'
          }
        }
      }
    });
    assertTest(
      'order.paid with only order entity processed successfully with HTTP 200',
      orderOnlyRes.status === 200 && orderOnlyRes.data?.status === 'ok',
      `Status: ${orderOnlyRes.status}`
    );
    const updatedOrderOnly = await Order.findById(orderOnlyOrder._id);
    assertTest(
      'Order reconciled from order.paid without payment entity: status Confirmed and payment Paid',
      updatedOrderOnly.status === 'Confirmed' && updatedOrderOnly.payment.status === 'Paid'
    );

    // 3.5 Concurrent Webhook Delivery (Race Condition Protection)
    const concurrentOrder = await Order.create({
      user: testUser._id,
      orderNumber: `CH-CONCUR-${testRunId}`,
      customer: { name: testUser.name, email: testUser.email, phone: testUser.phone },
      orderType: 'delivery',
      address: { address: '555 Parallel Rd', city: 'Test City', pincode: '123456' },
      items: [{ menuItem: testItem._id, name: testItem.name, image: testItem.image, price: 600, quantity: 1, subtotal: 600 }],
      pricing: { subtotal: 600, tax: 0, deliveryFee: 0, discount: 0, total: 600 }, // 60000 paise
      payment: { method: 'online', status: 'Pending' },
      status: 'Pending'
    });
    createdOrderIds.push(concurrentOrder._id);

    const concurrentRzpOrderId = `order_concur_${testRunId}`;
    const concurrentPayment = await Payment.create({
      order: concurrentOrder._id,
      user: testUser._id,
      razorpayOrderId: concurrentRzpOrderId,
      amount: 600,
      currency: 'INR',
      method: 'online',
      status: 'Created'
    });
    createdPaymentIds.push(concurrentPayment._id);

    const concurrentPayload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_concur_${testRunId}`,
            order_id: concurrentRzpOrderId,
            amount: 60000,
            currency: 'INR',
            method: 'upi'
          }
        }
      }
    };

    // Dispatch 3 concurrent requests simultaneously
    const concurrentResults = await Promise.all([
      sendWebhookRequest(concurrentPayload),
      sendWebhookRequest(concurrentPayload),
      sendWebhookRequest(concurrentPayload)
    ]);

    const allSucceeded = concurrentResults.every(res => res.status === 200);
    assertTest(
      'Concurrent duplicate webhook burst: all responses return HTTP 200',
      allSucceeded,
      `Statuses: ${concurrentResults.map(r => r.status).join(', ')}`
    );

    const finalConcurrentOrder = await Order.findById(concurrentOrder._id);
    const finalConcurrentPayment = await Payment.findById(concurrentPayment._id);
    assertTest(
      'Concurrent burst leaves Order in consistent Paid & Confirmed state',
      finalConcurrentOrder.payment.status === 'Paid' && finalConcurrentOrder.status === 'Confirmed'
    );
    assertTest(
      'Concurrent burst leaves Payment in consistent Paid state',
      finalConcurrentPayment.status === 'Paid' && finalConcurrentPayment.razorpayPaymentId === `pay_concur_${testRunId}`
    );

    // 3.6 Unsupported Event Delivery (Acknowledge with HTTP 200 without side effects)
    const unsupportedEventRes = await sendWebhookRequest({
      event: 'refund.created',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_test_123',
            amount: 1000
          }
        }
      }
    });
    assertTest(
      'Unsupported event acknowledged cleanly with HTTP 200 and no action taken',
      unsupportedEventRes.status === 200 && unsupportedEventRes.data?.message?.includes('no action taken'),
      `Status: ${unsupportedEventRes.status}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 4: Late Failure Protection
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. Late Failure Protection ---');

    // 4.1 Send payment.failed for already Paid order
    const lateFailRes = await sendWebhookRequest({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_fail_late_${testRunId}`,
            order_id: successRzpOrderId,
            error_description: 'Late bank network timeout'
          }
        }
      }
    });
    assertTest(
      'Late payment.failed event acknowledged cleanly with HTTP 200',
      lateFailRes.status === 200 && lateFailRes.data?.message?.includes('already marked as Paid'),
      `Status: ${lateFailRes.status}`
    );

    const checkOrderAfterLateFail = await Order.findById(successOrder._id);
    const checkPaymentAfterLateFail = await Payment.findById(successPayment._id);

    assertTest(
      'Late failure does NOT overwrite confirmed Paid status on Order',
      checkOrderAfterLateFail.payment.status === 'Paid' && checkOrderAfterLateFail.status === 'Confirmed'
    );
    assertTest(
      'Late failure does NOT overwrite confirmed Paid status on Payment',
      checkPaymentAfterLateFail.status === 'Paid'
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 5: Legitimate Payment Failure Handling
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. Legitimate Payment Failure on Pending Order ---');

    const failOrder = await Order.create({
      user: testUser._id,
      orderNumber: `CH-FAIL-${testRunId}`,
      customer: { name: testUser.name, email: testUser.email, phone: testUser.phone },
      orderType: 'pickup',
      items: [{ menuItem: testItem._id, name: testItem.name, image: testItem.image, price: 200, quantity: 1, subtotal: 200 }],
      pricing: { subtotal: 200, tax: 0, deliveryFee: 0, discount: 0, total: 200 },
      payment: { method: 'online', status: 'Pending' },
      status: 'Pending'
    });
    createdOrderIds.push(failOrder._id);

    const failRzpOrderId = `order_fail_${testRunId}`;
    const failPayment = await Payment.create({
      order: failOrder._id,
      user: testUser._id,
      razorpayOrderId: failRzpOrderId,
      amount: 200,
      currency: 'INR',
      method: 'online',
      status: 'Created'
    });
    createdPaymentIds.push(failPayment._id);

    const genuineFailRes = await sendWebhookRequest({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: `pay_gen_fail_${testRunId}`,
            order_id: failRzpOrderId,
            error_description: 'Insufficient funds'
          }
        }
      }
    });
    assertTest(
      'Legitimate payment.failed returns HTTP 200',
      genuineFailRes.status === 200 && genuineFailRes.data?.message?.includes('failure recorded'),
      `Status: ${genuineFailRes.status}`
    );

    const checkedFailedOrder = await Order.findById(failOrder._id);
    const checkedFailedPayment = await Payment.findById(failPayment._id);
    assertTest(
      'Order payment status updated to Failed',
      checkedFailedOrder.payment.status === 'Failed'
    );
    assertTest(
      'Payment model status updated to Failed',
      checkedFailedPayment.status === 'Failed'
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SUITE 6: Backward Compatibility (Frontend verify & COD)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. Backward Compatibility (Frontend Verification & COD) ---');

    // 6.1 Frontend verification endpoint still works
    const clientOrder = await Order.create({
      user: testUser._id,
      orderNumber: `CH-VERIFY-${testRunId}`,
      customer: { name: testUser.name, email: testUser.email, phone: testUser.phone },
      orderType: 'delivery',
      address: { address: '789 Client St', city: 'Test City', pincode: '123456' },
      items: [{ menuItem: testItem._id, name: testItem.name, image: testItem.image, price: 250, quantity: 1, subtotal: 250 }],
      pricing: { subtotal: 250, tax: 0, deliveryFee: 0, discount: 0, total: 250 },
      payment: { method: 'online', status: 'Pending' },
      status: 'Pending'
    });
    createdOrderIds.push(clientOrder._id);

    const clientRzpOrderId = `order_client_${testRunId}`;
    const clientRzpPaymentId = `pay_client_${testRunId}`;
    const clientPayment = await Payment.create({
      order: clientOrder._id,
      user: testUser._id,
      razorpayOrderId: clientRzpOrderId,
      amount: 250,
      currency: 'INR',
      method: 'online',
      status: 'Created'
    });
    createdPaymentIds.push(clientPayment._id);

    const clientSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${clientRzpOrderId}|${clientRzpPaymentId}`)
      .digest('hex');

    const verifyEndpointRes = await fetch(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        razorpay_order_id: clientRzpOrderId,
        razorpay_payment_id: clientRzpPaymentId,
        razorpay_signature: clientSignature,
        orderId: clientOrder._id
      })
    });
    const verifyData = await verifyEndpointRes.json();
    assertTest(
      'Frontend /api/payments/verify endpoint succeeds with valid signature',
      verifyEndpointRes.status === 200 && verifyData.success === true,
      `Status: ${verifyEndpointRes.status}`
    );

    // 6.2 Cash On Delivery checkout flow
    const codRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        orderType: 'delivery',
        customer: { name: testUser.name, email: testUser.email, phone: testUser.phone },
        address: { address: '999 COD Lane', city: 'Test City', pincode: '123456' },
        items: [{ menuItem: testItem._id, quantity: 1 }],
        payment: { method: 'COD' }
      })
    });
    const codData = await codRes.json();
    assertTest(
      'Cash on Delivery order creation succeeds',
      codRes.status === 201 && codData.order?.payment?.method === 'COD' && codData.order?.payment?.status === 'Pending',
      `Status: ${codRes.status}`
    );
    if (codData.order?.id || codData.order?._id) {
      createdOrderIds.push(codData.order.id || codData.order._id);
    }

  } catch (err) {
    console.error('Fatal webhook test runner error:', err);
  } finally {
    console.log('\nCleaning up webhook test artifacts from MongoDB...');
    try {
      if (createdPaymentIds.length > 0) {
        await Payment.deleteMany({ _id: { $in: createdPaymentIds } });
      }
      if (createdOrderIds.length > 0) {
        await Order.deleteMany({ _id: { $in: createdOrderIds } });
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
      console.log('Cleanup completed.');
    } catch (cleanErr) {
      console.error('Cleanup error:', cleanErr.message);
    }

    if (server) {
      server.close();
    }
    await mongoose.connection.close();

    console.log('\n======================================================');
    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    const failed = total - passed;
    console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  }
}

runWebhookSuite();
