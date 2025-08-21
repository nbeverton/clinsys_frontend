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
    // remove qualquer token velho para não ir no header
    localStorage.removeItem('token');

    const data = await apiRequest('/auth/login', {
      method: 'POST',
      auth: false, // << NÃO manda Authorization aqui
      body: { email, password: senha } // << vai como JSON
    });

    localStorage.setItem('token', data.token);
    window.location.href = '/dashboard.html';
  } catch (err) {
    alert('Usuário ou senha inválidos');
    console.error(err);
  }
}
