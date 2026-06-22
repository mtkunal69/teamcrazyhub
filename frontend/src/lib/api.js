import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tch_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err.response?.status;
    const url = err.config?.url || "";

    // Only treat 401 as session-invalidating for non-auth endpoints.
    // /auth/me, /auth/admin/login, /auth/user/login may legitimately 401
    // (e.g. wrong creds) and should NOT force logout/redirect.
    const isAuthCheck = url.includes("/auth/");

    if (status === 401 && !isAuthCheck) {
      const path = window.location.pathname;
      // Clear session
      localStorage.removeItem("tch_token");
      localStorage.removeItem("tch_user");
      window.dispatchEvent(new Event("auth:logout"));
      // Soft redirect via React Router on next render — only force-redirect
      // if user is currently inside a protected area
      if (path.startsWith("/admin") && path !== "/admin/login") {
        window.location.href = "/admin/login";
      } else if (path === "/app" || path.startsWith("/app/")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export function setSession(payload) {
  localStorage.setItem("tch_token", payload.token);
  localStorage.setItem("tch_user", JSON.stringify(payload));
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem("tch_user") || "null");
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("tch_token");
  localStorage.removeItem("tch_user");
}

export const fmtRupee = (n) => "\u20b9" + Number(n || 0).toLocaleString("en-IN");
export const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " \u00b7 " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
};
export const WORKER_TYPES = ["4 ID Worker", "5 ID Worker", "7 ID Worker", "10 ID Worker"];
export const WORKER_COLORS = {
  "4 ID Worker": "#5b7cff",
  "5 ID Worker": "#b47fff",
  "7 ID Worker": "#10d97e",
  "10 ID Worker": "#ffb020",
};
