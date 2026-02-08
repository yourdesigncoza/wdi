/**
 * Centralized API configuration.
 *
 * In dev: VITE_API_URL is unset → empty string → relative "/api" paths
 *         (Vite dev server proxies to localhost:8000)
 * In prod: VITE_API_URL = "https://backend.up.railway.app" → full URL
 *
 * Defence-in-depth: auto-upgrade http→https for non-localhost URLs to
 * prevent Mixed Content errors if the env var is misconfigured.
 */
function resolveApiBase(): string {
  const raw = import.meta.env.VITE_API_URL as string | undefined
  if (!raw) return '/api'

  let url = raw.trim().replace(/\/+$/, '')

  // Auto-upgrade http → https for production (non-localhost) URLs
  if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    url = url.replace('http://', 'https://')
  }

  return `${url}/api`
}

export const API_BASE = resolveApiBase()
