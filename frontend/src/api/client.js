const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000/api';

/**
 * Core fetch wrapper.
 * Attaches Authorization header from localStorage and handles 401 → token refresh → retry.
 *
 * @param {string} path  - Path relative to API_BASE (e.g. '/gallery/')
 * @param {RequestInit} [options] - Standard fetch options
 * @returns {Promise<Response>}
 */
async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Silent token refresh on 401
  if (response.status === 401 && !options._retry) {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('access_token', data.access);
          if (data.refresh) {
            localStorage.setItem('refresh_token', data.refresh);
          }
          // Retry original request with new token
          return apiFetch(path, { ...options, _retry: true });
        }
      } catch {
        // Refresh network failure — fall through to logout
      }
    }
    // Refresh failed or no refresh token — clear session
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.reload();
  }

  return response;
}

export { API_BASE, apiFetch };
export default apiFetch;
