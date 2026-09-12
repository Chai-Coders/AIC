const API_BASE = import.meta.env.VITE_API_BASE || '';

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

async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const headers = {
    ...(options.headers || {}),
  };

  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new Error('Unable to connect to CMS backend server. Please make sure the backend is running.');
  }

  if (response.status === 401) {
    // Attempt token refresh if available
    const refresh = getRefreshToken();
    if (refresh && !options._isRetry) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setTokens(refreshData.access, refresh);
          return request(endpoint, {
            ...options,
            _isRetry: true,
            headers: {
              ...headers,
              Authorization: `Bearer ${refreshData.access}`,
            },
          });
        }
      } catch (e) {
        // Refresh failed, clear session
      }
    }
    clearTokens();
  }

  if (!response.ok) {
    let errorDetail = 'Operation failed';
    try {
      const errData = await response.json();
      errorDetail =
        errData.detail ||
        errData.non_field_errors?.[0] ||
        errData.message ||
        Object.entries(errData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ') ||
        `Error (${response.status}): ${response.statusText}`;
    } catch {
      errorDetail = `Error (${response.status}): ${response.statusText}`;
    }
    const error = new Error(errorDetail);
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

export const api = {
  // Authentication
  auth: {
    login: async (username, password) => {
      const data = await request('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
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
          });
        }
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
      list: async () => {
        const res = await request('/gallery/');
        return Array.isArray(res) ? res : res.results || [];
      },
      create: async (formData) => request('/gallery/', { method: 'POST', body: formData }),
      update: async (id, formData) => request(`/gallery/${id}/`, { method: 'PATCH', body: formData }),
      delete: async (id) => request(`/gallery/${id}/`, { method: 'DELETE' }),
    },
    startups: {
      name: 'Startups',
      endpoint: '/api/startups/',
      list: async () => {
        const res = await request('/startups/');
        return Array.isArray(res) ? res : res.results || [];
      },
      create: async (formData) => request('/startups/', { method: 'POST', body: formData }),
      update: async (id, formData) => request(`/startups/${id}/`, { method: 'PATCH', body: formData }),
      delete: async (id) => request(`/startups/${id}/`, { method: 'DELETE' }),
    },
    news: {
      name: 'News Updates',
      endpoint: '/api/news/',
      list: async () => {
        const res = await request('/news/');
        return Array.isArray(res) ? res : res.results || [];
      },
      create: async (formData) => request('/news/', { method: 'POST', body: formData }),
      update: async (id, formData) => request(`/news/${id}/`, { method: 'PATCH', body: formData }),
      delete: async (id) => request(`/news/${id}/`, { method: 'DELETE' }),
    },
    team: {
      name: 'Team Members',
      endpoint: '/api/team/',
      list: async (category) => {
        const url = category ? `/team/?category=${encodeURIComponent(category)}` : '/team/';
        const res = await request(url);
        return Array.isArray(res) ? res : res.results || [];
      },
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
