// API Client for Smart Library Management System
const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const API_BASE_URL = rawApiUrl.replace(/\/+$/, '');

async function request(endpoint, options = {}) {
  // Normalize endpoint to always start with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'x-library-csrf': 'secure-smart-lib-csrf-token-2026',
    ...(options.headers || {})
  };

  // Attach JWT token if stored
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('library_access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Setup abort controller for timeout (15s)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || 15000);

  const config = {
    ...options,
    headers,
    signal: options.signal || controller.signal
  };

  try {
    let response;
    try {
      response = await fetch(url, config);
    } catch (networkErr) {
      if (networkErr.name === 'AbortError') {
        const timeoutError = new Error('Request timed out. The server took too long to respond.');
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }
      const connError = new Error('Cannot connect to Smart Library API server. Please ensure the backend is running on http://localhost:5000.');
      connError.code = 'CONNECTION_REFUSED';
      connError.originalError = networkErr;
      throw connError;
    } finally {
      clearTimeout(timeoutId);
    }

    // If 401 Token Expired, attempt seamless token refresh
    if (response.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('library_refresh_token');
      if (refreshToken && !options._retry && !endpoint.includes('/auth/')) {
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-library-csrf': 'secure-smart-lib-csrf-token-2026'
            },
            body: JSON.stringify({ refreshToken })
          });

          if (refreshRes.ok) {
            const data = await refreshRes.json();
            if (data.tokens?.accessToken) {
              localStorage.setItem('library_access_token', data.tokens.accessToken);
              if (data.tokens.refreshToken) {
                localStorage.setItem('library_refresh_token', data.tokens.refreshToken);
              }
              // Retry original request with new token
              options._retry = true;
              headers['Authorization'] = `Bearer ${data.tokens.accessToken}`;
              response = await fetch(url, { ...options, headers });
            }
          } else {
            // Refresh token expired or revoked - clear tokens
            localStorage.removeItem('library_access_token');
            localStorage.removeItem('library_refresh_token');
            localStorage.removeItem('library_user');
          }
        } catch (refreshErr) {
          console.warn('[AUTH] Automatic token refresh failed:', refreshErr);
        }
      }
    }

    const data = await response.json().catch(() => ({ error: 'Non-JSON response received from server' }));

    if (!response.ok) {
      const error = new Error(data.error || `HTTP error ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth endpoints
  auth: {
    login: (email, password) => request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
    register: (userData) => request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    verify2FA: (tempToken, otp) => request('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, otp })
    }),
    getProfile: () => request('/auth/profile'),
    toggle2FA: (enabled) => request('/auth/toggle-2fa', {
      method: 'POST',
      body: JSON.stringify({ enabled })
    })
  },

  // Books catalog endpoints
  books: {
    getAll: (params = {}) => {
      const query = new URLSearchParams();
      if (params.search) query.append('search', params.search);
      if (params.category) query.append('category', params.category);
      if (params.author) query.append('author', params.author);
      if (params.availability) query.append('availability', params.availability);
      const qStr = query.toString();
      return request(`/books${qStr ? `?${qStr}` : ''}`);
    },
    getById: (id) => request(`/books/${id}`),
    create: (bookData) => request('/books', {
      method: 'POST',
      body: JSON.stringify(bookData)
    }),
    update: (id, bookData) => request(`/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bookData)
    }),
    delete: (id) => request(`/books/${id}`, {
      method: 'DELETE'
    })
  },

  // Borrow & Return endpoints
  borrow: {
    borrowBook: (bookId, targetUserId = null) => request('/borrow/borrow', {
      method: 'POST',
      body: JSON.stringify({ bookId, targetUserId })
    }),
    returnBook: (recordId) => request('/borrow/return', {
      method: 'POST',
      body: JSON.stringify({ recordId })
    }),
    getMyHistory: () => request('/borrow/my-history'),
    getAllRecords: (params = {}) => {
      const query = new URLSearchParams();
      if (params.status) query.append('status', params.status);
      if (params.search) query.append('search', params.search);
      const qStr = query.toString();
      return request(`/borrow/all-records${qStr ? `?${qStr}` : ''}`);
    }
  },

  // Admin & Super Admin endpoints
  admin: {
    getUsers: () => request('/admin/users'),
    updateUserRole: (userId, roleId) => request(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ roleId })
    }),
    unlockUser: (userId) => request(`/admin/users/${userId}/unlock`, {
      method: 'POST'
    }),
    getAuditLogs: (params = {}) => {
      const query = new URLSearchParams();
      if (params.action) query.append('action', params.action);
      if (params.email) query.append('email', params.email);
      if (params.limit) query.append('limit', params.limit);
      const qStr = query.toString();
      return request(`/admin/audit-logs${qStr ? `?${qStr}` : ''}`);
    },
    getSystemStatus: () => request('/admin/system-status')
  },

  // Security Demo endpoints for presentation
  securityDemo: {
    testSqlInjection: (input) => request('/security-demo/test-sql-injection', {
      method: 'POST',
      body: JSON.stringify({ input })
    }),
    inspectDefenses: () => request('/security-demo/inspect-defenses')
  }
};
