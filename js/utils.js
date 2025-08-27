// js/utils.js
export const qs = (sel, el = document) => el.querySelector(sel);
export const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));

export const serializeForm = (form) => {
  const data = Object.fromEntries(new FormData(form).entries());
  // normaliza strings vazias para null onde fizer sentido:
  for (const k of Object.keys(data)) {
    if (data[k] === '') data[k] = null;
  }
  return data;
};

export const setFormValues = (form, values = {}) => {
  for (const [k, v] of Object.entries(values)) {
    const input = form.elements.namedItem(k);
    if (!input) continue;
    // para <input type="date">, normalize "2020-01-01T00:00:00"
    if (input.type === 'date' && typeof v === 'string') {
      input.value = v.split('T')[0];
    } else {
      input.value = v ?? '';
    }
  }
};

export const formatDateBR = (iso) => {
  if (!iso) return '';
  const [yyyy, mm, dd] = iso.split('T')[0].split('-');
  return `${dd}/${mm}/${yyyy}`;
};

// alerta bootstrap simples
export function showAlert(message, type = 'success') {
  const wrap = qs('#alerts');
  const el = document.createElement('div');
  el.className = `alert alert-${type} alert-dismissible fade show`;
  el.role = 'alert';
  el.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  wrap.appendChild(el);
  // fecha sozinho depois de um tempo (mimo)
  setTimeout(() => el.classList.remove('show'), 4000);
  setTimeout(() => el.remove(), 4500);
}
