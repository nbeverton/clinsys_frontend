// /js/appointments.js
import { apiRequest } from "./api.js";
import { isLogged } from "./auth.js";

if (!isLogged()) {
  window.location.href = "index.html";
}

const API_PATH = "/appointments";

/* -------------------
   Estado & elementos
   ------------------- */
const state = { page: 0, size: 10, sort: "date,desc" };
let cacheAll = []; // cache usado quando backend retorna lista completa (Array)

let tbody, pageInfo, loadingEl, prevBtn, nextBtn, appointmentForm;
let filterForm, filterPatientName, filterPatientId, filterSort;
let patientIdInput, patientNameReadInput;

/* -------------------
   Helpers
   ------------------- */
function showAlert(message, type = "info") {
  const host = document.getElementById("alerts");
  if (!host) return;
  host.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}
function setLoading(v) {
  if (!loadingEl) return;
  loadingEl.classList.toggle("d-none", !v);
}
function isPositiveIntString(s) {
  return typeof s === "string" && /^\d+$/.test(s.trim());
}

/* -------------------
   Prefill: buscar nome do paciente
   ------------------- */
async function fetchPatientName(patientId) {
  if (!patientId) return null;
  try {
    const p = await apiRequest(`/patients/${patientId}`, { method: "GET" });
    return p?.name ?? null;
  } catch (err) {
    console.warn("Não foi possível buscar paciente para prefill:", err);
    return null;
  }
}

async function prefillAppointmentFromContext({ autoOpen = false } = {}) {
  const params = new URLSearchParams(window.location.search);
  let patientId = params.get("patientId");

  if (!patientId) {
    patientId = sessionStorage.getItem("clinsys.newAppointment.patientId");
    if (patientId) sessionStorage.removeItem("clinsys.newAppointment.patientId");
  }

  if (!patientId) return;

  if (patientIdInput) patientIdInput.value = patientId;
  const name = await fetchPatientName(patientId);
  if (patientNameReadInput) patientNameReadInput.value = name ?? "—";

  if (autoOpen) {
    const modalEl = document.getElementById("appointmentModal");
    if (modalEl) new bootstrap.Modal(modalEl).show();
  }
}

/* -------------------
   Inicialização e handlers
   ------------------- */
function attachElements() {
  tbody = document.getElementById("appointmentsTableBody");
  pageInfo = document.getElementById("pageInfo");
  loadingEl = document.getElementById("loading");
  prevBtn = document.getElementById("prevPage");
  nextBtn = document.getElementById("nextPage");
  appointmentForm = document.getElementById("appointmentForm");

  filterForm = document.getElementById("filterForm");
  filterPatientName = document.getElementById("filterPatientName");
  filterPatientId = document.getElementById("filterPatientId");
  filterSort = document.getElementById("filterSort");

  patientIdInput = document.getElementById("patientId");
  patientNameReadInput = document.getElementById("patientNameRead");
}

function attachPager() {
  if (!prevBtn || !nextBtn) return;
  prevBtn.addEventListener("click", () => {
    if (state.page > 0) {
      state.page -= 1;
      loadAppointments();
    }
  });
  nextBtn.addEventListener("click", () => {
    state.page += 1;
    loadAppointments();
  });
}

function attachTableActions() {
  if (!tbody) return;
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === "edit") editAppointment(id);
    if (action === "delete") deleteAppointment(id);
  });
}

function attachFormHandlers() {
  if (!appointmentForm) return;
  appointmentForm.addEventListener("submit", saveAppointment);

  // atualizar nome do paciente quando patientId for editado manualmente
  if (patientIdInput) {
    patientIdInput.addEventListener("change", async () => {
      const v = (patientIdInput.value || "").trim();
      if (isPositiveIntString(v)) {
        const name = await fetchPatientName(v);
        if (patientNameReadInput) patientNameReadInput.value = name ?? "—";
      } else {
        if (patientNameReadInput) patientNameReadInput.value = "";
      }
    });
  }

  // filtros
  if (filterForm) {
    filterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      state.page = 0;
      state.sort = filterSort.value || state.sort;
      loadAppointments();
    });
  }
}

/* -------------------
   Carregar / renderizar
   ------------------- */
async function loadAppointments() {
  if (!tbody) return;
  tbody.innerHTML = "";
  setLoading(true);

  try {
    // tenta paginar no servidor
    const params = new URLSearchParams({ page: state.page, size: state.size, sort: state.sort });
    let data;
    try {
      data = await apiRequest(`${API_PATH}?${params.toString()}`, { method: "GET" });
    } catch (err) {
      // se falhar (backend não suporta), busca lista completa
      data = await apiRequest(API_PATH, { method: "GET" });
    }

    let items = [];
    if (Array.isArray(data)) {
      // lista completa: aplica filtros/ordenacao no cliente e pagina
      if (cacheAll.length === 0) cacheAll = data.slice();
      items = applyClientFilters(cacheAll);
      items = applyClientSort(items, state.sort || (filterSort && filterSort.value));
      const start = state.page * state.size;
      const end = start + state.size;
      const pageItems = items.slice(start, end);
      updatePaginationInfo({
        number: state.page,
        totalPages: Math.max(1, Math.ceil(items.length / state.size)),
        first: state.page === 0,
        last: end >= items.length,
        numberOfElements: pageItems.length,
      });
      renderRows(pageItems);
    } else {
      // Page do servidor
      const pageContent = data?.content ?? [];
      renderRows(pageContent.map(normalizeAppointment));
      updatePaginationInfo({
        number: data?.number ?? 0,
        totalPages: data?.totalPages ?? 1,
        first: data?.first ?? true,
        last: data?.last ?? true,
        numberOfElements: data?.numberOfElements ?? pageContent.length,
      });
      if (typeof data?.number === "number") state.page = data.number;
    }
  } catch (err) {
    console.error("Erro ao carregar consultas:", err);
    showAlert(err?.message?.includes("403") ? "Sessão expirada. Faça login." : "Erro ao carregar consultas.", "danger");
    if (err?.message?.includes("403")) window.location.href = "/";
  } finally {
    setLoading(false);
  }
}

// normaliza
function normalizeAppointment(a) {
  return {
    id: a.id,
    date: a.date,
    time: a.time,
    description: a.description,
    status: a.status,
    paid: a.paid,
    patientName: a.patientName ?? (a.patient ? a.patient.name : null),
    userName: a.userName ?? (a.user ? a.user.name : null),
    patientId: a.patientId ?? (a.patient ? a.patient.id : null),
    userId: a.userId ?? (a.user ? a.user.id : null),
  };
}

function applyClientFilters(list) {
  const name = (filterPatientName?.value || "").trim().toLowerCase();
  const pid = (filterPatientId?.value || "").trim();

  return list
    .map(normalizeAppointment)
    .filter((a) => {
      if (name && !(a.patientName || "").toLowerCase().includes(name)) return false;
      if (pid && !(String(a.patientId || "").includes(pid))) return false;
      return true;
    });
}

function applyClientSort(list, sort) {
  if (!sort) return list;
  const [field, dir] = (sort || "").split(",");
  const factor = dir === "asc" ? 1 : -1;

  return list.slice().sort((x, y) => {
    const a = (x[field] ?? "").toString().toLowerCase();
    const b = (y[field] ?? "").toString().toLowerCase();
    if (a < b) return -1 * factor;
    if (a > b) return 1 * factor;
    return 0;
  });
}

function renderRows(items) {
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Nenhuma consulta encontrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map((a) => {
      const patientTitle = a.patientId ? `ID: ${a.patientId}` : "";
      const userTitle = a.userId ? `ID: ${a.userId}` : "";
      return `
      <tr>
        <td>${a.date ?? "—"}</td>
        <td>${a.time ?? "—"}</td>
        <td title="${patientTitle}">${a.patientName ?? "—"}</td>
        <td title="${userTitle}">${a.userName ?? "—"}</td>
        <td>${a.status ?? "—"}</td>
        <td>${a.paid ? "Sim" : "Não"}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-2" data-action="edit" data-id="${a.id}">Editar</button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${a.id}">Excluir</button>
        </td>
      </tr>`;
    })
    .join("");
}

function updatePaginationInfo(page) {
  const { number, totalPages, first, last, numberOfElements } = page;
  if (pageInfo) pageInfo.textContent = `Página ${number + 1} de ${totalPages} • Itens nesta página: ${numberOfElements}`;
  if (prevBtn) prevBtn.disabled = !!first;
  if (nextBtn) nextBtn.disabled = !!last;
}

/* -------------------
   CRUD
   ------------------- */
async function saveAppointment(e) {
  e.preventDefault();
  if (!appointmentForm) return;

  const id = (document.getElementById("appointmentId").value || "").trim();
  const appointment = {
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    description: document.getElementById("description").value,
    status: document.getElementById("status").value,
    paid: document.getElementById("paid").value === "true",
    patientId: document.getElementById("patientId").value
    // ❌ não enviar userId
  };

  // validação simples
  if (!appointment.date || !appointment.time) {
    showAlert("Data e hora são obrigatórias.", "warning");
    return;
  }
  if (!isPositiveIntString(String(appointment.patientId))) {
    showAlert("Informe um ID de paciente válido.", "warning");
    return;
  }

  try {
    if (id) {
      await apiRequest(`${API_PATH}/${id}`, { method: "PUT", body: appointment });
    } else {
      await apiRequest(API_PATH, { method: "POST", body: appointment });
    }

    appointmentForm.reset();
    document.getElementById("appointmentId").value = "";
    const modal = bootstrap.Modal.getInstance(document.getElementById("appointmentModal"));
    modal?.hide();

    cacheAll = [];
    showAlert("Consulta salva com sucesso ✅", "success");
    loadAppointments();
  } catch (err) {
    console.error("Erro ao salvar consulta:", err);
    showAlert("Não foi possível salvar a consulta. Verifique os dados ou faça login novamente.", "danger");
  }
}

async function editAppointment(id) {
  try {
    const a = await apiRequest(`${API_PATH}/${id}`, { method: "GET" });

    document.getElementById("appointmentId").value = a.id ?? "";
    document.getElementById("date").value = a.date ?? "";
    document.getElementById("time").value = a.time ?? "";
    document.getElementById("description").value = a.description ?? "";
    document.getElementById("status").value = a.status ?? "AGENDADA";
    document.getElementById("paid").value = a.paid ? "true" : "false";

    document.getElementById("patientId").value = a.patientId ?? "";
    if (patientNameReadInput) patientNameReadInput.value = a.patientName ?? "—";

    new bootstrap.Modal(document.getElementById("appointmentModal")).show();
  } catch (err) {
    console.error("Erro ao buscar consulta:", err);
    showAlert("Não foi possível carregar a consulta selecionada.", "danger");
  }
}

async function deleteAppointment(id) {
  if (!confirm("Tem certeza que deseja excluir esta consulta?")) return;
  try {
    await apiRequest(`${API_PATH}/${id}`, { method: "DELETE" });
    cacheAll = [];
    showAlert("Consulta excluída com sucesso 🗑️", "success");
    if (tbody.children.length === 1 && state.page > 0) state.page -= 1;
    loadAppointments();
  } catch (err) {
    console.error("Erro ao excluir consulta:", err);
    showAlert("Erro ao excluir. Tente novamente ou faça login.", "danger");
  }
}

/* -------------------
   Bootstrapping
   ------------------- */
document.addEventListener("DOMContentLoaded", () => {
  attachElements();
  attachPager();
  attachTableActions();
  attachFormHandlers();
  prefillAppointmentFromContext({ autoOpen: false }).catch((err) => console.error("Prefill falhou:", err));
  loadAppointments();
});
