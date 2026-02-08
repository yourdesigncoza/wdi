/**
 * Centralized API configuration.
 *
 * In dev: VITE_API_URL is unset → empty string → relative "/api" paths
 *         (Vite dev server proxies to localhost:8000)
 * In prod: VITE_API_URL = "https://backend.up.railway.app" → full URL
 */
export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'
