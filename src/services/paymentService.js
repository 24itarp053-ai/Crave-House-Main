/**
 * paymentService.js
 * Frontend service for handling Razorpay payment integration with backend.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get Authorization headers with stored JWT token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('craveHouseToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Internal helper to process fetch HTTP responses
 */
async function handleResponse(response) {
  if (!response.ok) {
    let msg = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) msg = body.message;
    } catch (_) {}
    throw new Error(msg);
  }
  return response.json();
}

/**
 * Request Razorpay order creation from backend for a specific order
 * POST /api/payments/create-order
 * @param {string} orderId - MongoDB ObjectId of the created order
 */
export async function createPaymentOrder(orderId) {
  const url = `${BASE_URL}/payments/create-order`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ orderId })
  });
  return handleResponse(response);
}

/**
 * Verify Razorpay payment signature on backend
 * POST /api/payments/verify
 * @param {object} paymentData - { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId }
 */
export async function verifyPayment(paymentData) {
  const url = `${BASE_URL}/payments/verify`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(paymentData)
  });
  return handleResponse(response);
}

/**
 * Report payment failure to backend
 * POST /api/payments/failed
 * @param {object} failureData - { razorpay_order_id, reason }
 */
export async function reportPaymentFailed(failureData) {
  const url = `${BASE_URL}/payments/failed`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(failureData)
  });
  return handleResponse(response);
}

/**
 * Admin: Get all payment transactions
 * GET /api/payments/admin
 * @param {object} params
 */
export async function getAdminPayments(params = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, value);
    }
  }
  const queryString = qs.toString() ? `?${qs.toString()}` : '';
  const url = `${BASE_URL}/payments/admin${queryString}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}
