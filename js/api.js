// js/api.js
export const API_BASE = 'http://localhost:8080/api';
const TOKEN_KEY = 'clinsys_token';

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/';
    throw new Error('Não autorizado (401)');
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export async function apiRequest(path, { method = 'GET', body, headers = {} } = {}) {
  headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // tenta extrair mensagem do corpo
    try {
      const err = await res.json();
      throw new Error(err.message || JSON.stringify(err));
    } catch (e) {
      // se não for JSON
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  return handleResponse(res);
}
