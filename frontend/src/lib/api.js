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
    if (err.response?.status === 401) {
      localStorage.removeItem("tch_token");
      localStorage.removeItem("tch_user");
      const path = window.location.pathname;
      if (path.startsWith("/admin") && path !== "/admin/login") {
        window.location.href = "/admin/login";
      } else if (path.startsWith("/app") && path !== "/login") {
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

export const fmtRupee = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
export const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " +
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
