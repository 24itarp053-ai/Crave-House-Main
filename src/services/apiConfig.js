/**
 * apiConfig.js
 * Centralized API configuration and base URL provider for Crave House frontend.
 * Confirms that production builds require a valid VITE_API_URL or fail with a clear diagnostic.
 */

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (import.meta.env.PROD) {
    const errorMsg = '[Crave House Production Error] Missing required environment variable: VITE_API_URL. In production, frontend services require a valid VITE_API_URL and cannot silently fall back to localhost. Configure VITE_API_URL in your hosting platform (e.g., Vercel project environment settings).';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return 'http://localhost:5000/api';
}

export const API_BASE_URL = getApiBaseUrl();

/**
 * Centralized authorization header helper
 */
export function getAuthHeaders() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  const token = localStorage.getItem('craveHouseToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Fetch wrapper with timeout protection for sleeping backend / cold-start detection.
 * Defaults to 25s timeout to accommodate Render free instance spin-ups.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const signal = options.signal || controller.signal;

  try {
    const response = await fetch(url, {
      ...options,
      signal
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Server request timed out. The backend server may be waking up from sleep; please try again in a few moments.');
    }
    if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error('Network error. Unable to reach the Crave House API server. Please check your connection.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Standard HTTP response handler with auth expiration detection
 */
export async function handleApiResponse(response) {
  if (!response.ok) {
    let msg = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.message) msg = body.message;
    } catch (_) {}

    // If unauthorized, notify application to invalidate stale session
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cravehouse:unauthorized', {
        detail: { message: msg }
      }));
    }

    throw new Error(msg);
  }
  return response.json();
}
