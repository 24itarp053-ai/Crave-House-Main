/**
 * configService.js
 * API service to fetch sanitized public restaurant configuration from backend.
 */

import { API_BASE_URL as BASE_URL } from './apiConfig';

/**
 * Fetch public restaurant configuration from backend API
 */
export async function fetchPublicRestaurantConfig() {
  try {
    const response = await fetch(`${BASE_URL}/config`);
    if (!response.ok) {
      throw new Error(`Failed to fetch config (status ${response.status})`);
    }
    const data = await response.json();
    return data?.config || null;
  } catch (err) {
    // Non-fatal: falls back cleanly to local configuration
    return null;
  }
}
