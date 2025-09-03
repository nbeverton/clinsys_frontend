// js/patients.js
import { apiRequest } from './api.js';
import { isLogged, logout } from './auth.js';
import { qs, qsa, serializeForm, setFormValues, formatDateBR, showAlert } from './utils.js';

if (!isLogged()) {
  window.location.href = 'index.html';
}

// estado de paginação e filtros
const state = {
  page: 0,
  size: 10,
  sort: 'name,asc',
  q: '' // filtro por nome (contém)
};

const tbody = qs('#tbodyPacientes');
const pageInfo = qs('#pageInfo');
const prevBtn = qs('#prevPage');
const nextBtn = qs('#nextPage');
const btnNovo = qs('#btnNovo');
// const btnLogout = qs('#btnLogout');
const filterForm = qs('#filterForm');

const form = qs('#patientForm');
const modalEl = qs('#pacienteModal');
const modal = new bootstrap.Modal(modalEl);
const modalTitle = qs('#modalTitle');
const btnSalvar = qs('#btnSalvar');

// listeners básicos
// btnLogout.addEventListener('click', () => logout());

filterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state.q = qs('#q').value?.trim();
  state.sort = qs('#sort').value;
  state.size = parseInt(qs('#size').value || '10', 10);
  state.page = 0;
  loadPatients();
});

btnNovo.addEventListener('click', () => openCreateModal());

prevBtn.addEventListener('click', () => {
  if (state.page > 0) {
    state.page -= 1;
    loadPatients();
  }
});
nextBtn.addEventListener('click', () => {
  state.page += 1; // validaremos "last" pela resposta
  loadPatients();
});

// delegação para botões de edição na tabela
tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action="edit"]');
  if (!btn) return;
  const id = btn.dataset.id;
  openEditModal(id);
});

// bloco para exclusão
tbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === 'new-appointment') {
    openAppointmentModal(id);
  }

  if (action === 'edit') {
    openEditModal(id);
  }

  if (action === 'delete') {
    if (!confirm('Deseja realmente excluir este paciente?')) return;
    try {
      await apiRequest(`/patients/${id}`, { method: 'DELETE' });
      showAlert('Paciente excluído com sucesso 🗑️', 'success');
      loadPatients();
    } catch (err) {
      console.error(err);
      showAlert('Erro ao excluir paciente.', 'danger');
    }
  }
});


// validação do formulário + submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // validação nativa + classe bootstrap
  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const data = serializeForm(form);
  const id = data.id;
  try {
    btnSalvar.disabled = true;

    // se o backend não quer "id" no body no PUT, pode remover:
    // delete data.id;

    if (id) {
      // EDITAR
      await apiRequest(`/patients/${id}`, { method: 'PUT', body: data });
      showAlert('Paciente atualizado com sucesso ✅', 'success');
    } else {
      // CRIAR
      await apiRequest('/patients', { method: 'POST', body: data });
      showAlert('Paciente criado com sucesso ✅', 'success');
    }

    modal.hide();
    loadPatients();
  } catch (err) {
    console.error(err);
    showAlert(err.message || 'Erro ao salvar paciente', 'danger');
  } finally {
    btnSalvar.disabled = false;
  }
});

async function openCreateModal() {
  form.reset();
  form.classList.remove('was-validated');
  setFormValues(form, { id: null, name: '', email: '', phone: '', birthDate: null, gender: '' });
  modalTitle.textContent = 'Novo Paciente';
  modal.show();
}

async function openEditModal(id) {
  try {
    const paciente = await apiRequest(`/patients/${id}`);
    form.reset();
    form.classList.remove('was-validated');
    setFormValues(form, paciente);
    modalTitle.textContent = `Editar: ${paciente.nome ?? 'Paciente'}`;
    modal.show();
  } catch (err) {
    console.error(err);
    showAlert('Não foi possível carregar o paciente.', 'danger');
  }
}

function renderRows(items) {
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum paciente encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(p => `
    <tr>
      <td>${p.name ?? '—'}</td>
      <td>${p.email ?? '—'}</td>
      <td>${p.phone ?? '—'}</td>
      <td>${p.birthDate ? formatDateBR(p.birthDate) : '—'}</td>
      <td>${p.gender ?? '—'}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-id="${p.id}">Editar</button>
          <button class="btn btn-sm btn-outline-danger me-1" data-action="delete" data-id="${p.id}">Excluir</button>
          <button class="btn btn-sm btn-outline-success" data-action="new-appointment" data-id="${p.id}">Nova Consulta</button>
        </td>
    </tr>
  `).join('');
}

function updatePaginationInfo(pageData, size, totalElements) {
  // quando vier Spring Page
  if (pageData && typeof pageData.number === 'number') {
    const { number, totalPages, first, last, numberOfElements } = pageData;
    pageInfo.textContent = `Página ${number + 1} de ${totalPages} • Itens nesta página: ${numberOfElements}`;
    prevBtn.disabled = first;
    nextBtn.disabled = last;
    return;
  }

  // fallback: lista simples (sem paginação do servidor)
  const start = state.page * size + 1;
  const end = Math.min((state.page + 1) * size, totalElements || 0);
  pageInfo.textContent = totalElements
    ? `Exibindo ${start}–${end} de ${totalElements}`
    : `Itens ${start}–${end}`;
  // não dá pra saber "first" e "last" sem total — deixo ambos habilitados
  prevBtn.disabled = state.page === 0;
  nextBtn.disabled = false;
}

// Spinner de loading
const loadingEl = qs('#loading');

// Carregar pacientes
async function loadPatients() {
  try {
    loadingEl.classList.remove('d-none'); // mostra spinner

      const params = new URLSearchParams();
      params.set('page', state.page);
      params.set('size', state.size);
      params.set('sort', state.sort);
      if (state.q) params.set('name', state.q); // envia name (o backend também aceita 'q')

    const data = await apiRequest(`/patients?${params.toString()}`);

    const items = Array.isArray(data) ? data : (data.content ?? []);
    renderRows(items);

    if (Array.isArray(data)) {
      updatePaginationInfo(null, state.size, data.length);
    } else {
      updatePaginationInfo(data, data.size, data.totalElements);
      if (typeof data.number === 'number') state.page = data.number;
      if (typeof data.size === 'number') state.size = data.size;
    }
  } catch (err) {
    console.error(err);
    showAlert('Erro ao carregar pacientes.', 'danger');
  } finally {
    loadingEl.classList.add('d-none'); // esconde spinner
  }
}

// Para adicionar consulta direto na página de paciente (Busca pelo nome)
const appointmentModalEl = document.getElementById('appointmentModal');
const appointmentModal = new bootstrap.Modal(appointmentModalEl);
const appointmentForm = document.getElementById('appointmentForm');

function openAppointmentModal(patientId) {
  document.getElementById('appointmentPatientId').value = patientId;
  appointmentForm.reset();
  appointmentModal.show();
}

appointmentForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const appointment = {
    date: document.getElementById('appointmentDate').value,
    time: document.getElementById('appointmentTime').value,
    description: document.getElementById('appointmentDescription').value,
    status: 'AGENDADA',
    paid: false,
    patientId: document.getElementById('appointmentPatientId').value,
    userId: document.getElementById('appointmentUserId').value
  };

  try {
    await apiRequest('/appointments', { method: 'POST', body: appointment });
    showAlert('Consulta criada com sucesso ✅', 'success');
    appointmentModal.hide();
  } catch (err) {
    console.error(err);
    showAlert('Erro ao criar consulta', 'danger');
  }
});


// aplicar máscara no campo telefone
Inputmask({ mask: "(99) 99999-9999" }).mask("#phone");

// carregamento inicial
loadPatients();
