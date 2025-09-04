// /js/appointments.js
import { apiRequest } from "./api.js";
import { isLogged } from "./auth.js";

if (!isLogged()) {
  window.location.href = "index.html";
}

const API_PATH = "/appointments";

// estado de paginação (cliente)
const state = {
  page: 0,
  size: 10,
  sort: "date,desc",
};

// cache para quando o backend devolver LIST em vez de PAGE
let cacheAll = [];

const tbody = document.getElementById("appointmentsTableBody");
const pageInfo = document.getElementById("pageInfo");
const loadingEl = document.getElementById("loading");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");

// helpers visuais
function showAlert(message, type = "info") {
  const host = document.getElementById("alerts");
  host.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}
function setLoading(v) {
  loadingEl.classList.toggle("d-none", !v);
}

// init
document.addEventListener("DOMContentLoaded", () => {
  attachTableActions();
  attachPager();
  loadAppointments();
  document.getElementById("appointmentForm").addEventListener("submit", saveAppointment);
});

function attachPager() {
  prevBtn.addEventListener("click", () => {
    if (state.page > 0) {
      state.page -= 1;
      loadAppointments();
    }
  });
  nextBtn.addEventListener("click", () => {
    state.page += 1; // validação de "last" ocorre após carregar
    loadAppointments();
  });
}

// delegação de eventos na tabela
function attachTableActions() {
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;

    if (action === "edit") editAppointment(id);
    if (action === "delete") deleteAppointment(id);
  });
}

// Carregar lista de consultas (com fallback de paginação)
async function loadAppointments() {
  tbody.innerHTML = "";
  setLoading(true);

  try {
    // Tentativa de pedir paginação do servidor
    const params = new URLSearchParams({
      page: state.page,
      size: state.size,
      sort: state.sort,
    });

    let data;
    try {
      data = await apiRequest(`${API_PATH}?${params.toString()}`, { method: "GET" });
    } catch (err) {
      // se o backend não aceitar page/size (ou outro erro), cai no fetch simples
      data = await apiRequest(API_PATH, { method: "GET" });
    }

    // Se vier Page (Spring), usa o formato da página. Se vier Array, usa client-side.
    let items = [];
    if (Array.isArray(data)) {
      if (cacheAll.length === 0) cacheAll = data.slice(); // cacheia a lista completa
      const start = state.page * state.size;
      const end = start + state.size;
      items = cacheAll.slice(start, end);
      updatePaginationInfo({
        number: state.page,
        totalPages: Math.max(1, Math.ceil(cacheAll.length / state.size)),
        first: state.page === 0,
        last: end >= cacheAll.length,
        numberOfElements: items.length,
      });
    } else {
      // Page: { content, number, totalPages, first, last, numberOfElements }
      items = data?.content ?? [];
      updatePaginationInfo({
        number: data?.number ?? 0,
        totalPages: data?.totalPages ?? 1,
        first: data?.first ?? true,
        last: data?.last ?? true,
        numberOfElements: data?.numberOfElements ?? items.length,
      });
      // mantém state.page coerente com o backend
      if (typeof data?.number === "number") state.page = data.number;
    }

    renderRows(items);
  } catch (err) {
    console.error("Erro ao carregar consultas:", err);
    showAlert(
      err?.message?.includes("403")
        ? "Sua sessão expirou ou você não tem permissão. Faça login novamente."
        : "Erro ao carregar consultas.",
      "danger"
    );
    if (err?.message?.includes("403")) window.location.href = "/";
  } finally {
    setLoading(false);
  }
}

function renderRows(items) {
  if (!items || items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Nenhuma consulta encontrada.</td></tr>`;
    return;
  }

  tbody.innerHTML = items
    .map(
      (a) => `
      <tr>
        <td>${a.date ?? "—"}</td>
        <td>${a.time ?? "—"}</td>
        <td>${a.patientName ?? "—"}</td>
        <td>${a.userName ?? "—"}</td>
        <td>${a.status ?? "—"}</td>
        <td>${a.paid ? "Sim" : "Não"}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary me-2" data-action="edit" data-id="${a.id}">Editar</button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${a.id}">Excluir</button>
        </td>
      </tr>`
    )
    .join("");
}

function updatePaginationInfo(page) {
  const { number, totalPages, first, last, numberOfElements } = page;
  pageInfo.textContent = `Página ${number + 1} de ${totalPages} • Itens nesta página: ${numberOfElements}`;
  prevBtn.disabled = !!first;
  nextBtn.disabled = !!last;
}

// Salvar ou atualizar consulta
async function saveAppointment(e) {
  e.preventDefault();

  const id = document.getElementById("appointmentId").value.trim();
  const appointment = {
    date: document.getElementById("date").value,
    time: document.getElementById("time").value,
    description: document.getElementById("description").value,
    status: document.getElementById("status").value,
    paid: document.getElementById("paid").value === "true",
    patientId: document.getElementById("patientId").value,
    userId: document.getElementById("userId").value,
  };

  try {
    if (id) {
      await apiRequest(`${API_PATH}/${id}`, { method: "PUT", body: appointment });
    } else {
      await apiRequest(API_PATH, { method: "POST", body: appointment });
    }

    // limpa e fecha modal
    document.getElementById("appointmentForm").reset();
    document.getElementById("appointmentId").value = "";
    const modal = bootstrap.Modal.getInstance(document.getElementById("appointmentModal"));
    modal?.hide();

    cacheAll = []; // invalida cache da lista
    showAlert("Consulta salva com sucesso ✅", "success");
    loadAppointments();
  } catch (err) {
    console.error("Erro ao salvar consulta:", err);
    showAlert("Não foi possível salvar a consulta. Verifique os dados ou faça login novamente.", "danger");
  }
}

// Editar consulta
async function editAppointment(id) {
  try {
    const a = await apiRequest(`${API_PATH}/${id}`, { method: "GET" });

    document.getElementById("appointmentId").value = a.id;
    document.getElementById("date").value = a.date ?? "";
    document.getElementById("time").value = a.time ?? "";
    document.getElementById("description").value = a.description ?? "";
    document.getElementById("status").value = a.status ?? "AGENDADA";
    document.getElementById("paid").value = a.paid ? "true" : "false";

    // IMPORTANTE: se o backend não retornar patientId/userId (apenas os nomes),
    // o usuário precisará informar os IDs para salvar a edição.
    document.getElementById("patientId").value = a.patientId ?? "";
    document.getElementById("userId").value = a.userId ?? "";

    new bootstrap.Modal(document.getElementById("appointmentModal")).show();
  } catch (err) {
    console.error("Erro ao buscar consulta:", err);
    showAlert("Não foi possível carregar a consulta selecionada.", "danger");
  }
}

// Excluir consulta
async function deleteAppointment(id) {
  if (!confirm("Tem certeza que deseja excluir esta consulta?")) return;

  try {
    await apiRequest(`${API_PATH}/${id}`, { method: "DELETE" });
    cacheAll = []; // invalida cache
    showAlert("Consulta excluída com sucesso 🗑️", "success");
    // se excluir o único item da última página, volta uma página
    if (tbody.children.length === 1 && state.page > 0) state.page -= 1;
    loadAppointments();
  } catch (err) {
    console.error("Erro ao excluir consulta:", err);
    showAlert("Erro ao excluir. Tente novamente ou faça login.", "danger");
  }
}
