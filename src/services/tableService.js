/**
 * tableService.js
 * API service for managing restaurant tables in MongoDB.
 */

import { API_BASE_URL as BASE_URL, getAuthHeaders, fetchWithTimeout, handleApiResponse } from './apiConfig';

/**
 * GET /api/tables
 * List all restaurant tables with live computed operational status
 */
export async function getTables() {
  const url = `${BASE_URL}/tables`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleApiResponse(response);
}

/**
 * GET /api/tables/:id
 * Retrieve a specific table by ID
 */
export async function getTableById(id) {
  const url = `${BASE_URL}/tables/${id}`;
  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleApiResponse(response);
}

/**
 * POST /api/tables
 * Create a new restaurant table (Admin/Owner)
 */
export async function createTable(tableData) {
  const url = `${BASE_URL}/tables`;
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(tableData)
  });
  return handleApiResponse(response);
}

/**
 * PUT /api/tables/:id
 * Update an existing table's details (Admin/Owner)
 */
export async function updateTable(id, tableData) {
  const url = `${BASE_URL}/tables/${id}`;
  const response = await fetchWithTimeout(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(tableData)
  });
  return handleApiResponse(response);
}

/**
 * PATCH /api/tables/:id/status
 * Toggle or set table active/inactive status (Admin/Owner)
 */
export async function toggleTableStatus(id, isActive) {
  const url = `${BASE_URL}/tables/${id}/status`;
  const response = await fetchWithTimeout(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(isActive !== undefined ? { isActive } : {})
  });
  return handleApiResponse(response);
}

/**
 * DELETE /api/tables/:id
 * Delete a table (safe check against existing reservations)
 */
export async function deleteTable(id) {
  const url = `${BASE_URL}/tables/${id}`;
  const response = await fetchWithTimeout(url, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleApiResponse(response);
}
