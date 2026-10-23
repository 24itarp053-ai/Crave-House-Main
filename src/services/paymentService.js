/**
 * paymentService.js
 * Frontend service for handling Razorpay payment integration with backend.
 */

import { API_BASE_URL as BASE_URL, getAuthHeaders, fetchWithTimeout, handleApiResponse } from './apiConfig';

/**
 * Request Razorpay order creation from backend for a specific order
 * POST /api/payments/create-order
 * @param {string} orderId - MongoDB ObjectId of the created order
 */
export async function createPaymentOrder(orderId) {
  const url = `${BASE_URL}/payments/create-order`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ orderId })
  });
  return handleApiResponse(response);
}

/**
 * Verify Razorpay payment signature on backend
 * POST /api/payments/verify
 * @param {object} paymentData - { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId }
 */
export async function verifyPayment(paymentData) {
  const url = `${BASE_URL}/payments/verify`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(paymentData)
  });
  return handleApiResponse(response);
}

/**
 * Report payment failure to backend
 * POST /api/payments/failed
 * @param {object} failureData - { razorpay_order_id, reason }
 */
export async function reportPaymentFailed(failureData) {
  const url = `${BASE_URL}/payments/failed`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(failureData)
  });
  return handleApiResponse(response);
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
  
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleApiResponse(response);
}
