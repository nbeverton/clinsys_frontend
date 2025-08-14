// /js/auth.js
import { apiRequest } from './api.js';

export function isLogged() {
  return !!localStorage.getItem('token');
}

export function logout() {
  localStorage.removeItem('token');
  window.location.href = '/';
}

export async function login(email, senha) {
  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password: senha }
    });
    localStorage.setItem('token', data.token);
    window.location.href = '/dashboard.html';
  } catch (err) {
    alert('Usuário ou senha inválidos');
    console.error(err);
  }
}
