// /js/api.js
const API_BASE = 'http://localhost:8080/api';

export async function apiRequest(path, { method = 'GET', body, headers } = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(API_BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(headers || {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

if (!res.ok) {
  const errorText = await res.text();
  throw new Error(errorText || `HTTP ${res.status}`);
}

if (res.status === 401) {
  localStorage.removeItem('token');
  window.location.href = '/';
}

  return res.status === 204 ? null : res.json();

}
