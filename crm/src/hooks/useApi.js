import { useState, useCallback, useEffect } from 'react';

/**
 * Low-level fetch wrapper that auto-redirects on 401.
 */
async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || body.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

/**
 * Build query string from params object.
 */
function qs(params) {
  if (!params) return '';
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

/**
 * Stateless API helper — import and call directly.
 */
export const api = {
  get: (url, params) => request(url + qs(params)),
  post: (url, body) =>
    request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) =>
    request(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body) =>
    request(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
  upload: (url, formData) =>
    fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }).then(async (res) => {
      if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error(body.error || `HTTP ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return res.json();
    }),
};

/**
 * React hook for data fetching with loading/error state.
 * Usage:
 *   const { data, error, loading, refetch } = useApi('/api/guests', { page: 1 });
 */
export function useApi(url, params) {
  const [state, setState] = useState({ data: null, error: null, loading: true });

  const fetchData = useCallback(
    async (overrideParams) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const data = await api.get(url, overrideParams || params);
        setState({ data, error: null, loading: false });
        return data;
      } catch (err) {
        setState({ data: null, error: err.message, loading: false });
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, JSON.stringify(params)]
  );

  // Auto-fetch on mount / param change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

export default api;
