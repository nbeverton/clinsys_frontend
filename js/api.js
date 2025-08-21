// /js/api.js
const API_BASE = "http://localhost:8080/api";

export async function apiRequest(
  path,
  { method = "GET", headers = {}, body, auth = true } = {}
) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  // não manda Authorization para /auth/**
  const isAuthEndpoint = path.startsWith("/auth/");
  const shouldAttachToken = auth && !isAuthEndpoint;

  const finalHeaders = { ...headers };

  // define Content-Type se estiver mandando JSON
  const sendingJson = body !== undefined && !(body instanceof FormData);
  if (sendingJson && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (shouldAttachToken) {
    const token = localStorage.getItem("token");
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const finalBody =
    body === undefined
      ? undefined
      : body instanceof FormData
      ? body
      : JSON.stringify(body);

  const res = await fetch(url, { method, headers: finalHeaders, body: finalBody });

  // se o token está inválido/expirado, removemos e voltamos para login
  if ((res.status === 401 || res.status === 403) && shouldAttachToken) {
    localStorage.removeItem("token");
    // opcional: redirecionar automaticamente
    // window.location.href = "/";
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}${text ? " - " + text : ""}`);
  }

  if (res.status === 204) return null;

  const ct = res.headers.get("Content-Type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}
