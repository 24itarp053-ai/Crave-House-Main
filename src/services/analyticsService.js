/**
 * analyticsService.js
 * Centralized API service for retrieving dashboard live analytics and statistics.
 */

import { API_BASE_URL as BASE_URL, getAuthHeaders, fetchWithTimeout, handleApiResponse } from './apiConfig';

/**
 * GET /api/analytics/admin
 * Admin dashboard analytics (KPIs, revenue charts, category breakdown, top foods)
 */
export async function getAdminAnalytics() {
  const url = `${BASE_URL}/analytics/admin`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleApiResponse(response);
}

/**
 * GET /api/analytics/owner
 * Owner dashboard analytics (KPIs, weekly/monthly revenue, category breakdown, daily revenue)
 */
export async function getOwnerAnalytics() {
  const url = `${BASE_URL}/analytics/owner`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleApiResponse(response);
}

