import { apiRequest } from "./api.js";

const API_PATH = "/appointments";

document.addEventListener("DOMContentLoaded", () => {
  loadAppointments();

  const form = document.getElementById("appointmentForm");
  form.addEventListener("submit", saveAppointment);
});

// Carregar lista de consultas
async function loadAppointments() {
  const tbody = document.getElementById("appointmentsTableBody");
  tbody.innerHTML = "";

  try {
    const appointments = await apiRequest(API_PATH, { method: "GET" });

    appointments.forEach((a) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${a.date}</td>
        <td>${a.time}</td>
        <td>${a.patientName}</td>
        <td>${a.userName}</td>
        <td>${a.status}</td>
        <td>${a.paid ? "Sim" : "Não"}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="editAppointment(${a.id})">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAppointment(${a.id})">Excluir</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar consultas:", err.message);
    if (err.message.includes("403")) {
      alert("Sua sessão expirou ou você não tem permissão. Faça login novamente.");
      window.location.href = "/";
    }
  }
}

// Salvar ou atualizar consulta
async function saveAppointment(e) {
  e.preventDefault();

  const id = document.getElementById("appointmentId").value;
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
      await apiRequest(`${API_PATH}/${id}`, {
        method: "PUT",
        body: appointment,
      });
    } else {
      await apiRequest(API_PATH, {
        method: "POST",
        body: appointment,
      });
    }

    document.getElementById("appointmentForm").reset();
    document.getElementById("appointmentId").value = "";
    const modal = bootstrap.Modal.getInstance(document.getElementById("appointmentModal"));
    modal.hide();
    loadAppointments();
  } catch (err) {
    console.error("Erro ao salvar consulta:", err.message);
    alert("Não foi possível salvar a consulta. Verifique os dados ou faça login novamente.");
  }
}

// Editar consulta
async function editAppointment(id) {
  try {
    const a = await apiRequest(`${API_PATH}/${id}`, { method: "GET" });

    document.getElementById("appointmentId").value = a.id;
    document.getElementById("date").value = a.date;
    document.getElementById("time").value = a.time;
    document.getElementById("description").value = a.description;
    document.getElementById("status").value = a.status;
    document.getElementById("paid").value = a.paid ? "true" : "false";
    document.getElementById("patientId").value = ""; // backend retorna só o nome
    document.getElementById("userId").value = "";    // backend retorna só o nome

    const modal = new bootstrap.Modal(document.getElementById("appointmentModal"));
    modal.show();
  } catch (err) {
    console.error("Erro ao buscar consulta:", err.message);
  }
}

// Excluir consulta
async function deleteAppointment(id) {
  if (!confirm("Tem certeza que deseja excluir esta consulta?")) return;

  try {
    await apiRequest(`${API_PATH}/${id}`, { method: "DELETE" });
    loadAppointments();
  } catch (err) {
    console.error("Erro ao excluir consulta:", err.message);
    alert("Erro ao excluir. Tente novamente ou faça login.");
  }
}
