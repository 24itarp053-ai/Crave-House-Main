/**
 * reservationService.js
 * Centralized API service for managing table reservations in MongoDB.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
 * POST /api/reservations
 * Create a new table reservation
 */
export async function createReservation(reservationData) {
  const url = `${BASE_URL}/reservations`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(reservationData)
  });
  return handleResponse(response);
}

/**
 * GET /api/reservations
 * Retrieve customer's own table reservations
 */
export async function getMyReservations() {
  const url = `${BASE_URL}/reservations`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

/**
 * GET /api/reservations/admin
 * Retrieve all table reservations (Admin/Owner)
 */
export async function getAdminReservations() {
  const url = `${BASE_URL}/reservations/admin`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

/**
 * PATCH /api/reservations/:id/status
 * Update reservation operational status (Admin/Owner)
 */
export async function updateReservationStatus(id, status) {
  const url = `${BASE_URL}/reservations/${id}/status`;
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
