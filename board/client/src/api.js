const BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  getBoard: () => request('/board'),
  createColumn: (name) => request('/columns', { method: 'POST', body: { name } }),
  updateColumn: (id, patch) => request(`/columns/${id}`, { method: 'PATCH', body: patch }),
  deleteColumn: (id) => request(`/columns/${id}`, { method: 'DELETE' }),
  createIssue: (data) => request('/issues', { method: 'POST', body: data }),
  updateIssue: (id, patch) => request(`/issues/${id}`, { method: 'PATCH', body: patch }),
  deleteIssue: (id) => request(`/issues/${id}`, { method: 'DELETE' }),
};
