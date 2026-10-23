/**
 * userService.js
 * Centralized API service for profile retrieval and admin user management.
 */

import { API_BASE_URL as BASE_URL, getAuthHeaders, fetchWithTimeout, handleApiResponse } from './apiConfig';

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
 * Get current user profile
 * GET /api/users/profile
 */
export async function getProfile() {
  const url = `${BASE_URL}/users/profile`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleApiResponse(response);
}

/**
 * Update current user profile
 * PUT /api/users/profile
 * @param {object} profileData - name, email, phone
 */
export async function updateProfile(profileData) {
  const url = `${BASE_URL}/users/profile`;
  const response = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(profileData)
  });
  return handleApiResponse(response);
}

/**
 * Admin: Get all users (paginated)
 * GET /api/users
 */
export async function getUsers(params = {}) {
  const url = `${BASE_URL}/users${buildQuery(params)}`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleApiResponse(response);
}

/**
 * Admin: Get user by ID
 * GET /api/users/:id
 */
export async function getUserById(userId) {
  const url = `${BASE_URL}/users/${userId}`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleApiResponse(response);
}

/**
 * Admin: Update user details & role
 * PUT /api/users/:id
 */
export async function updateUser(userId, userData) {
  const url = `${BASE_URL}/users/${userId}`;
  const response = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(userData)
  });
  return handleApiResponse(response);
}

/**
 * Admin: Update user status
 * PATCH /api/users/:id/status
 */
export async function updateUserStatus(userId, status) {
  const url = `${BASE_URL}/users/${userId}/status`;
  const response = await fetchWithTimeout(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ status })
  });
  return handleApiResponse(response);
}

/**
 * Change current customer password
 * PUT /api/users/change-password
 * @param {string} currentPassword
 * @param {string} newPassword
 * @param {string} confirmPassword
 */
export async function changePassword(currentPassword, newPassword, confirmPassword) {
  const url = `${BASE_URL}/users/change-password`;
  const response = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
  });
  return handleApiResponse(response);
}
