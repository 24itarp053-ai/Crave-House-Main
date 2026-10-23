/**
 * reservationService.js
 * Centralized API service for managing table reservations in MongoDB.
 */

import { API_BASE_URL as BASE_URL, getAuthHeaders, fetchWithTimeout, handleApiResponse } from './apiConfig';

/**
 * POST /api/reservations
 * Create a new table reservation
 */
export async function createReservation(reservationData) {
  const url = `${BASE_URL}/reservations`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(reservationData)
  });
  return handleApiResponse(response);
}

/**
 * GET /api/reservations
 * Retrieve customer's own table reservations
 */
export async function getMyReservations() {
  const url = `${BASE_URL}/reservations`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleApiResponse(response);
}

/**
 * GET /api/reservations/admin
 * Retrieve all table reservations (Admin/Owner)
 */
export async function getAdminReservations() {
  const url = `${BASE_URL}/reservations/admin`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleApiResponse(response);
}

/**
 * PATCH /api/reservations/:id/status
 * Update reservation operational status (Admin/Owner)
 */
export async function updateReservationStatus(id, status, table = null) {
  const url = `${BASE_URL}/reservations/${id}/status`;
  const response = await fetchWithTimeout(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(table ? { status, table } : { status })
  });
  return handleApiResponse(response);
}

/**
 * GET /api/reservations/availability
 * Verify table availability against live database bookings and business hours
 */
export async function checkTableAvailability({ date, time, guests }) {
  const params = new URLSearchParams({ date, time, guests: String(guests) });
  const url = `${BASE_URL}/reservations/availability?${params.toString()}`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    }
  });
  return handleApiResponse(response);
}
