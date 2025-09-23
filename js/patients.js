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
  q: '',    // filtro por nome (contém)
  cpf: ''   // novo: filtro por cpf (pode ser parcial)
};

const tbody = qs('#tbodyPacientes');
const pageInfo = qs('#pageInfo');
const prevBtn = qs('#prevPage');
const nextBtn = qs('#nextPage');
const btnNovo = qs('#btnNovo');
const filterForm = qs('#filterForm');

const form = qs('#patientForm');
const modalEl = qs('#pacienteModal');
const modal = new bootstrap.Modal(modalEl);
const modalTitle = qs('#modalTitle');
const btnSalvar = qs('#btnSalvar');

// -- EVOLUÇÕES: elementos
const evolutionModalEl = qs('#evolutionModal');
const evolutionModal = evolutionModalEl ? new bootstrap.Modal(evolutionModalEl) : null;
const evolutionListEl = qs('#evolutionList');
const evolutionPageInfo = qs('#evolutionPageInfo');
const evoPrevBtn = qs('#evoPrev');
const evoNextBtn = qs('#evoNext');
const evolutionForm = qs('#evolutionForm');
const evolutionIdInput = qs('#evolutionId');
const evolutionContentInput = qs('#evolutionContent');
const evolutionAppointmentSelect = qs('#evolutionAppointmentId');
const evolutionPatientNameEl = qs('#evolutionPatientName');

const filterCpfInput = qs('#cpfFilter');
const cpfInput = qs('#cpf');

// estado de evoluções (por paciente)
const evolutionState = {
  patientId: null,
  page: 0,
  size: 5, // quantas evoluções por página no modal
};

// listeners básicos
btnNovo.addEventListener('click', () => openCreateModal());

filterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  state.q = qs('#q').value?.trim();
  state.cpf = qs('#cpfFilter').value?.trim();  // pega valor do filtro de CPF
  state.sort = qs('#sort').value;
  state.size = parseInt(qs('#size').value || '10', 10);
  state.page = 0;
  loadPatients();
});

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
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'new-appointment') {
    openAppointmentModal(id);
  } else if (action === 'edit') {
    openEditModal(id);
  } else if (action === 'delete') {
    deletePatient(id);
  } else if (action === 'evolution') {
    openEvolutionModal(id);
  }
});

// bloco para exclusão
async function deletePatient(id) {
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


// validação do formulário + submit
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  form.classList.add('was-validated');
  if (!form.checkValidity()) return;

  const data = serializeForm(form);
  const id = data.id;
  try {
    btnSalvar.disabled = true;

    if (id) {
      await apiRequest(`/patients/${id}`, { method: 'PUT', body: data });
      showAlert('Paciente atualizado com sucesso ✅', 'success');
    } else {
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
  setFormValues(form, { id: null, name: '', cpf: '', email: '', phone: '', birthDate: null, gender: '' });
  modalTitle.textContent = 'Novo Paciente';
  modal.show();
}

async function openEditModal(id) {
  try {
    const paciente = await apiRequest(`/patients/${id}`);
    form.reset();
    form.classList.remove('was-validated');
    setFormValues(form, paciente); // preenche name, cpf, email, etc.
    modalTitle.textContent = `Editar: ${paciente.name ?? 'Paciente'}`;
    modal.show();
  } catch (err) {
    console.error(err);
    showAlert('Não foi possível carregar o paciente.', 'danger');
  }
}

// formatação do CPF para exibição (aceita CPF com ou sem formatação)
function formatCpfBR(cpf) {
  if (!cpf) return '—';
  // remove não dígitos
  const digits = String(cpf).replace(/\D/g, '');
  if (digits.length !== 11) return cpf; // retorna o que veio se não tiver 11 dígitos
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function renderRows(items) {
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhum paciente encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(p => `
    <tr>
      <td>${p.name ?? '—'}</td>
      <td>${p.cpf ? formatCpfBR(p.cpf) : '—'}</td>
      <td>${p.email ?? '—'}</td>
      <td>${p.phone ?? '—'}</td>
      <td>${p.birthDate ? formatDateBR(p.birthDate) : '—'}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-id="${p.id}">Editar</button>
        <button class="btn btn-sm btn-outline-danger me-1" data-action="delete" data-id="${p.id}">Excluir</button>
        <button class="btn btn-sm btn-outline-success me-1" data-action="new-appointment" data-id="${p.id}">Nova Consulta</button>
        <button class="btn btn-sm btn-outline-secondary" data-action="evolution" data-id="${p.id}">Evolução</button>
      </td>
    </tr>
  `).join('');
}

function updatePaginationInfo(pageData, size, totalElements) {
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
    loadingEl.classList.remove('d-none');

    const params = new URLSearchParams();
    params.set('page', state.page);
    params.set('size', state.size);
    params.set('sort', state.sort);
    if (state.q) params.set('name', state.q);
    if (state.cpf) {
      // envia cpf já sem formatação (remove máscara)
      const cpfDigits = state.cpf.replace(/\D/g, '');
      params.set('cpf', cpfDigits);
    }

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
    loadingEl.classList.add('d-none');
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

/* ====================
   EVOLUÇÕES (modal)
   ==================== */

// abre modal de evoluções para um paciente
async function openEvolutionModal(patientId) {
  evolutionState.patientId = patientId;
  evolutionState.page = 0;
  evolutionIdInput.value = '';
  evolutionContentInput.value = '';

  // tenta buscar nome do paciente para o título do modal
  try {
    const p = await apiRequest(`/patients/${patientId}`);
    if (evolutionPatientNameEl) evolutionPatientNameEl.textContent = p.name ?? `Paciente #${patientId}`;
  } catch (err) {
    if (evolutionPatientNameEl) evolutionPatientNameEl.textContent = `Paciente #${patientId}`;
  }

  // limpa select de appointments e tenta popular (opcional)
  if (evolutionAppointmentSelect) {
    evolutionAppointmentSelect.innerHTML = `<option value="">Nenhuma</option>`;
    try {
      // tentativa simples: busca todas e filtra por patientId (se backend devolver patientId em responses)
      const appts = await apiRequest('/appointments');
      const filtered = Array.isArray(appts)
        ? appts.filter(a => String(a.patientId) === String(patientId) || (a.patientName && a.patientName.includes(evolutionPatientNameEl?.textContent || '')))
        : [];
      filtered.forEach(a => {
        const label = `${a.date ?? ''} ${a.time ?? ''} — ${a.userName ?? '—'}`;
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = label;
        evolutionAppointmentSelect.appendChild(opt);
      });
    } catch (err) {
      // não crítico; apenas não mostra opções
      console.debug('Não foi possível buscar consultas para popular select:', err);
    }
  }

  if (evolutionModal) evolutionModal.show();
  await loadEvolutions(); // carrega a primeira página
}

// carregar página de evoluções do paciente atual
async function loadEvolutions(page = evolutionState.page) {
  if (!evolutionState.patientId) return;
  evolutionListEl.innerHTML = `<div class="text-center text-muted">Carregando...</div>`;
  try {
    const params = new URLSearchParams({ page: page, size: evolutionState.size });
    const data = await apiRequest(`/evolutions/patient/${evolutionState.patientId}?${params.toString()}`);
    const items = Array.isArray(data) ? data : (data.content ?? []);
    renderEvolutions(items);

    // paginação do server (se Page)
    if (!Array.isArray(data)) {
      const info = {
        number: data.number ?? 0,
        totalPages: data.totalPages ?? 1,
        first: data.first ?? true,
        last: data.last ?? true,
        numberOfElements: data.numberOfElements ?? items.length
      };
      updateEvolutionPagination(info);
      evolutionState.page = info.number;
    } else {
      // fallback client-side
      updateEvolutionPagination({
        number: evolutionState.page,
        totalPages: Math.max(1, Math.ceil(items.length / evolutionState.size)),
        first: evolutionState.page === 0,
        last: (evolutionState.page + 1) * evolutionState.size >= items.length,
        numberOfElements: items.length
      });
    }
  } catch (err) {
    console.error('Erro ao carregar evoluções:', err);
    evolutionListEl.innerHTML = `<div class="text-danger">Erro ao carregar evoluções.</div>`;
  }
}

function renderEvolutions(items) {
  if (!items || items.length === 0) {
    evolutionListEl.innerHTML = `<div class="text-center text-muted">Nenhuma evolução registrada.</div>`;
    return;
  }

  // cada item: mostra autor, createdAt, updatedAt, content (com quebra de linha)
  evolutionListEl.innerHTML = items.map(e => {
    const created = e.createdAt ? new Date(e.createdAt).toLocaleString() : '—';
    const updated = e.updatedAt ? new Date(e.updatedAt).toLocaleString() : null;
    const author = e.authorName ?? '—';
    const appointment = e.appointmentId ? ` (consulta #${e.appointmentId})` : '';
    return `
      <div class="card mb-2" data-evo-id="${e.id}">
        <div class="card-body">
          <div class="d-flex justify-content-between mb-2">
            <div class="small text-muted">Por ${author} • ${created}${appointment}</div>
            <div>
              <button class="btn btn-sm btn-outline-primary me-1" data-evo-action="edit" data-evo-id="${e.id}">Editar</button>
              <button class="btn btn-sm btn-outline-danger" data-evo-action="delete" data-evo-id="${e.id}">Excluir</button>
            </div>
          </div>
          <div style="white-space:pre-wrap;">${escapeHtml(e.content)}</div>
          ${updated ? `<div class="small text-muted mt-2">Última edição: ${updated}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// simples função para escapar html antes de inserir (proteção XSS)
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateEvolutionPagination(page) {
  if (!page) return;
  if (evolutionPageInfo) evolutionPageInfo.textContent = `Página ${page.number + 1} de ${page.totalPages} • Itens: ${page.numberOfElements}`;
  if (evoPrevBtn) evoPrevBtn.disabled = !!page.first;
  if (evoNextBtn) evoNextBtn.disabled = !!page.last;
}

if (evoPrevBtn) evoPrevBtn.addEventListener('click', () => {
  if (evolutionState.page > 0) {
    evolutionState.page -= 1;
    loadEvolutions();
  }
});
if (evoNextBtn) evoNextBtn.addEventListener('click', () => {
  evolutionState.page += 1;
  loadEvolutions();
});

// delegação de eventos dentro da lista de evoluções (editar/excluir)
if (evolutionListEl) {
  evolutionListEl.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-evo-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-evo-action');
    const evoId = btn.getAttribute('data-evo-id');
    if (action === 'edit') {
      await editEvolution(evoId);
    } else if (action === 'delete') {
      await deleteEvolution(evoId);
    }
  });
}

// submeter criação/edição de evolução
if (evolutionForm) {
  evolutionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = evolutionContentInput.value?.trim();
    if (!content) {
      showAlert('O conteúdo da evolução não pode ficar vazio.', 'warning');
      return;
    }
    const appointmentId = evolutionAppointmentSelect?.value || null;
    const dto = {
      content,
      patientId: evolutionState.patientId,
      appointmentId: appointmentId || null
      // authorId: opcional (recomendo que backend use o usuário do token)
    };

    const id = evolutionIdInput.value?.trim();
    try {
      if (id) {
        await apiRequest(`/evolutions/${id}`, { method: 'PUT', body: dto });
        showAlert('Evolução atualizada com sucesso ✅', 'success');
      } else {
        await apiRequest('/evolutions', { method: 'POST', body: dto });
        showAlert('Evolução criada com sucesso ✅', 'success');
      }
      // limpa o form, recarrega lista
      evolutionIdInput.value = '';
      evolutionContentInput.value = '';
      if (evolutionAppointmentSelect) evolutionAppointmentSelect.value = '';
      await loadEvolutions(0);
    } catch (err) {
      console.error('Erro ao salvar evolução:', err);
      showAlert('Erro ao salvar a evolução.', 'danger');
    }
  });
}

// editar evolução (preenche o form)
async function editEvolution(evoId) {
  try {
    const e = await apiRequest(`/evolutions/${evoId}`);
    evolutionIdInput.value = e.id ?? '';
    evolutionContentInput.value = e.content ?? '';
    if (evolutionAppointmentSelect && e.appointmentId) evolutionAppointmentSelect.value = e.appointmentId;
    // abre modal se não estiver aberto
    if (evolutionModal) evolutionModal.show();
  } catch (err) {
    console.error('Erro ao carregar evolução:', err);
    showAlert('Não foi possível carregar a evolução.', 'danger');
  }
}

// deletar evolução
async function deleteEvolution(evoId) {
  if (!confirm('Deseja excluir esta evolução?')) return;
  try {
    await apiRequest(`/evolutions/${evoId}`, { method: 'DELETE' });
    showAlert('Evolução excluída com sucesso 🗑️', 'success');
    // recarrega página atual de evoluções (ajusta página se necessário)
    if (evolutionListEl.children.length === 1 && evolutionState.page > 0) evolutionState.page -= 1;
    loadEvolutions();
  } catch (err) {
    console.error('Erro ao excluir evolução:', err);
    showAlert('Erro ao excluir evolução.', 'danger');
  }
}

// aplicar máscara no campo telefone
Inputmask({ mask: "(99) 99999-9999" }).mask("#phone");
Inputmask({ mask: "999.999.999-99" }).mask("#cpf");
Inputmask({ mask: "999.999.999-99" }).mask("#cpfFilter");

// carregamento inicial
loadPatients();
