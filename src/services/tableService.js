/**
 * tableService.js
 * API service for managing restaurant tables in MongoDB.
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
 * GET /api/tables
 * List all restaurant tables with live computed operational status
 */
export async function getTables() {
  const url = `${BASE_URL}/tables`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

/**
 * GET /api/tables/:id
 * Retrieve a specific table by ID
 */
export async function getTableById(id) {
  const url = `${BASE_URL}/tables/${id}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

/**
 * POST /api/tables
 * Create a new restaurant table (Admin/Owner)
 */
export async function createTable(tableData) {
  const url = `${BASE_URL}/tables`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(tableData)
  });
  return handleResponse(response);
}

/**
 * PUT /api/tables/:id
 * Update an existing table's details (Admin/Owner)
 */
export async function updateTable(id, tableData) {
  const url = `${BASE_URL}/tables/${id}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(tableData)
  });
  return handleResponse(response);
}

/**
 * PATCH /api/tables/:id/status
 * Toggle or set table active/inactive status (Admin/Owner)
 */
export async function toggleTableStatus(id, isActive) {
  const url = `${BASE_URL}/tables/${id}/status`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify(isActive !== undefined ? { isActive } : {})
  });
  return handleResponse(response);
}

/**
 * DELETE /api/tables/:id
 * Delete a table (safe check against existing reservations)
 */
export async function deleteTable(id) {
  const url = `${BASE_URL}/tables/${id}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}
