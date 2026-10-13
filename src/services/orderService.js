/**
 * orderService.js
 * Centralized API service for placing and retrieving customer orders.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Get JWT token from local storage and return Authorization headers
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('craveHouseToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Internal helper to handle fetch responses
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
 * Create a new customer order
 * POST /api/orders
 * @param {object} orderData
 */
export async function createOrder(orderData) {
  const url = `${BASE_URL}/orders`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(orderData)
  });
  return handleResponse(response);
}

/**
 * Get all orders for the authenticated customer
 * GET /api/orders
 */
export async function getMyOrders() {
  const url = `${BASE_URL}/orders`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

/**
 * Get single order details (own order only)
 * GET /api/orders/:id
 * @param {string} orderId - MongoDB ObjectId string
 */
export async function getOrderById(orderId) {
  const url = `${BASE_URL}/orders/${orderId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

/**
 * Helper to build query parameters
 */
function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, value);
    }
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

/**
 * Admin: Get all orders (paginated, filterable)
 * GET /api/orders/admin
 */
export async function getAdminOrders(params = {}) {
  const url = `${BASE_URL}/orders/admin${buildQuery(params)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

/**
 * Admin: Get individual order by ID
 * GET /api/orders/admin/:id
 */
export async function getAdminOrderById(orderId) {
  const url = `${BASE_URL}/orders/admin/${orderId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

/**
 * Owner: Get all orders (paginated, filterable)
 * GET /api/orders/owner
 */
export async function getOwnerOrders(params = {}) {
  const url = `${BASE_URL}/orders/owner${buildQuery(params)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

/**
 * Owner: Get individual order by ID
 * GET /api/orders/owner/:id
 */
export async function getOwnerOrderById(orderId) {
  const url = `${BASE_URL}/orders/owner/${orderId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

/**
 * Admin/Owner: Update order operational status
 * PATCH /api/orders/:id/status
 */
export async function updateOrderStatus(orderId, status) {
  const url = `${BASE_URL}/orders/${orderId}/status`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ status })
  });
  return handleResponse(response);
}

/**
 * Admin Only: Update order payment status
 * PATCH /api/orders/:id/payment-status
 */
export async function updateOrderPaymentStatus(orderId, status) {
  const url = `${BASE_URL}/orders/${orderId}/payment-status`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ status })
  });
  return handleResponse(response);
}
