// /js/auth.js
export function isLogged() {
  return !!localStorage.getItem('token');
}
export function logout() {
  localStorage.removeItem('token');
  window.location.href = '/';
}