// All backend routes live under /api (proxied to Django by Vite in dev).
const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/+$/, '');

export const SESSION_EXPIRED_EVENT = 'cms:session-expired';

export function getAuthToken() {
  return localStorage.getItem('cms_access_token');
}

export function getRefreshToken() {
  return localStorage.getItem('cms_refresh_token');
}

export function setTokens(access, refresh) {
  if (access) localStorage.setItem('cms_access_token', access);
  if (refresh) localStorage.setItem('cms_refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('cms_access_token');
  localStorage.removeItem('cms_refresh_token');
  localStorage.removeItem('cms_user');
}

// Shared in-flight refresh so parallel 401s don't each rotate (and blacklist) the same refresh token.
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = getRefreshToken();
      if (!refresh) return null;
      try {
        const res = await fetch(`${API_BASE}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        // ROTATE_REFRESH_TOKENS is on: the old refresh token is now blacklisted.
        setTokens(data.access, data.refresh || refresh);
        return data.access;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function expireSession() {
  clearTokens();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

async function request(endpoint, options = {}) {
  const { _isRetry, skipAuth, skipAuthRefresh, ...fetchOptions } = options;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    ...(fetchOptions.headers || {}),
  };

  const token = getAuthToken();
  if (token && !skipAuth && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(fetchOptions.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
    });
  } catch (err) {
    throw new Error('Unable to connect to CMS backend server. Please make sure the backend is running.', { cause: err });
  }

  if (response.status === 401 && !skipAuthRefresh) {
    if (!_isRetry && getRefreshToken()) {
      const newAccess = await refreshAccessToken();
      if (newAccess) {
        return request(endpoint, {
          ...options,
          _isRetry: true,
          headers: {
            ...(fetchOptions.headers || {}),
            Authorization: `Bearer ${newAccess}`,
          },
        });
      }
    }
    expireSession();
  }

  if (!response.ok) {
    let errorDetail;
    try {
      const errData = await response.json();
      errorDetail =
        errData.detail ||
        errData.error ||
        errData.non_field_errors?.[0] ||
        errData.message ||
        Object.entries(errData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
    } catch {
      // Non-JSON error body (e.g. proxy/HTML error page)
    }
    const error = new Error(errorDetail || `Error (${response.status}): ${response.statusText || 'Request failed'}`);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return true;
  }

  try {
    return await response.json();
  } catch {
    return true;
  }
}

// DRF paginates list endpoints (PAGE_SIZE=20); walk every page so the CMS shows all records.
async function listAll(endpoint, params = {}) {
  const items = [];
  for (let page = 1; page <= 500; page++) {
    const query = new URLSearchParams({ ...params, page: String(page) });
    const res = await request(`${endpoint}?${query}`);
    if (Array.isArray(res)) return res;
    items.push(...(res.results || []));
    if (!res.next) break;
  }
  return items;
}

export const api = {
  // Authentication
  auth: {
    login: async (username, password) => {
      const data = await request('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        skipAuth: true,
        skipAuthRefresh: true,
      });
      if (data.access) {
        setTokens(data.access, data.refresh);
        if (data.user) {
          localStorage.setItem('cms_user', JSON.stringify(data.user));
        }
      }
      return data;
    },
    getMe: async () => {
      const user = await request('/auth/me/');
      localStorage.setItem('cms_user', JSON.stringify(user));
      return user;
    },
    logout: async () => {
      const refresh = getRefreshToken();
      try {
        if (refresh) {
          await request('/auth/logout/', {
            method: 'POST',
            body: JSON.stringify({ refresh }),
            skipAuth: true,
            skipAuthRefresh: true,
          });
        }
      } catch (err) {
        // Server-side revocation is best effort; the local session is always cleared.
        console.warn('Logout request failed:', err);
      } finally {
        clearTokens();
      }
    },
  },

  // Generic CRUD for CMS entities
  endpoints: {
    gallery: {
      name: 'Gallery',
      endpoint: '/api/gallery/',
      list: async () => listAll('/gallery/'),
      create: async (formData) => request('/gallery/', { method: 'POST', body: formData }),
      update: async (id, formData) => request(`/gallery/${id}/`, { method: 'PATCH', body: formData }),
      delete: async (id) => request(`/gallery/${id}/`, { method: 'DELETE' }),
    },
    startups: {
      name: 'Startups',
      endpoint: '/api/startups/',
      list: async () => listAll('/startups/'),
      create: async (formData) => request('/startups/', { method: 'POST', body: formData }),
      update: async (id, formData) => request(`/startups/${id}/`, { method: 'PATCH', body: formData }),
      delete: async (id) => request(`/startups/${id}/`, { method: 'DELETE' }),
    },
    news: {
      name: 'News Updates',
      endpoint: '/api/news/',
      list: async () => listAll('/news/'),
      create: async (formData) => request('/news/', { method: 'POST', body: formData }),
      update: async (id, formData) => request(`/news/${id}/`, { method: 'PATCH', body: formData }),
      delete: async (id) => request(`/news/${id}/`, { method: 'DELETE' }),
    },
    team: {
      name: 'Team Members',
      endpoint: '/api/team/',
      list: async (category) => listAll('/team/', category ? { category } : {}),
      create: async (formData) => request('/team/', { method: 'POST', body: formData }),
      update: async (id, formData) => request(`/team/${id}/`, { method: 'PATCH', body: formData }),
      delete: async (id) => request(`/team/${id}/`, { method: 'DELETE' }),
    },
    backgroundVideo: {
      name: 'Background Video',
      endpoint: '/api/backgroundvideo/',
      get: async () => request('/backgroundvideo/'),
      upload: async (formData) => request('/backgroundvideo/', { method: 'POST', body: formData }),
    },
  },
};
