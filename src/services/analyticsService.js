/**
 * analyticsService.js
 * Centralized API service for retrieving dashboard live analytics and statistics.
 */

import { API_BASE_URL as BASE_URL } from './apiConfig';

const getAuthHeaders = () => {
  const token = localStorage.getItem('craveHouseToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

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
 * GET /api/analytics/admin
 * Admin dashboard analytics (KPIs, revenue charts, category breakdown, top foods)
 */
export async function getAdminAnalytics() {
  const url = `${BASE_URL}/analytics/admin`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

/**
 * GET /api/analytics/owner
 * Owner dashboard analytics (KPIs, weekly/monthly revenue, category breakdown, daily revenue)
 */
export async function getOwnerAnalytics() {
  const url = `${BASE_URL}/analytics/owner`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}
