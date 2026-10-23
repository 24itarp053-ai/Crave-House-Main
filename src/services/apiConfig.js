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
