const BASE = '/api';

export const getToken = () => localStorage.getItem('token');

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const api = {
  register: (b) => request('/auth/register', { method: 'POST', body: b }),
  login: (b) => request('/auth/login', { method: 'POST', body: b }),
  stats: () => request('/stats'),
  docs: () => request('/docs'),
  upload: (formData) => request('/docs', { method: 'POST', body: formData }),
  deleteDoc: (id) => request(`/docs/${id}`, { method: 'DELETE' }),
  chat: (b) => request('/chat', { method: 'POST', body: b }),
  chatHistory: () => request('/chat/history'),
  clearHistory: () => request('/chat/history', { method: 'DELETE' }),
  generate: (b) => request('/generate', { method: 'POST', body: b }),
  evaluate: (b) => request('/evaluate', { method: 'POST', body: b }),
  plan: (b) => request('/plan', { method: 'POST', body: b }),
  saveCards: (b) => request('/cards/bulk', { method: 'POST', body: b }),
  cards: () => request('/cards'),
  dueCards: () => request('/cards/due'),
  reviewCard: (id, rating) => request(`/cards/${id}/review`, { method: 'POST', body: { rating } }),
  saveAttempt: (b) => request('/attempts', { method: 'POST', body: b }),
  progress: () => request('/progress'),
  tasks: () => request('/tasks'),
  addTask: (b) => request('/tasks', { method: 'POST', body: b }),
  toggleTask: (id, done) => request(`/tasks/${id}`, { method: 'PATCH', body: { done } }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
};
