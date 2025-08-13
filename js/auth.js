import { API_BASE, apiRequest } from './api.js';

const TOKEN_KEY = 'clinsys_token';

export async function login(email, senha) {
  // se seu backend tiver outro formato, ajuste o caminho e nomes
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erro no login');
  }

  const data = await res.json();
  if (!data.token) throw new Error('Resposta do servidor não contém token');
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = '/';
}

export function isLogged() {
  return !!localStorage.getItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
