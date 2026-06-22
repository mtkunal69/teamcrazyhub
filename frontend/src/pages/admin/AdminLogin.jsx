import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function AdminLogin() {
  const { loginAdmin } = useAuth();
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await loginAdmin(u, p);
      nav("/admin");
    } catch (e) {
      setErr(e.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.brandRow}>
          <div style={S.logo}>TC</div>
          <div>
            <div style={S.brand}>TeamCrazy Hub</div>
            <div style={S.sub}>Admin Console</div>
          </div>
        </div>
        <h2 style={S.h}>Admin Sign In</h2>
        <p style={S.p}>Restricted access — staff use the worker login</p>
        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label style={S.label}>
            <span>Username</span>
            <input
              data-testid="admin-login-username-input"
              value={u}
              onChange={(e) => setU(e.target.value)}
              placeholder="admin"
              style={S.input}
              autoComplete="username"
            />
          </label>
          <label style={S.label}>
            <span>Password</span>
            <input
              data-testid="admin-login-password-input"
              type="password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              placeholder="••••••••"
              style={S.input}
              autoComplete="current-password"
            />
          </label>
          {err && (
            <div data-testid="admin-login-error" style={S.err}>
              {err}
            </div>
          )}
          <button data-testid="admin-login-submit" type="submit" disabled={loading} style={S.btn}>
            {loading ? "Signing in..." : "Enter Admin Console →"}
          </button>
        </form>
        <div style={S.foot}>
          Worker?{" "}
          <Link data-testid="admin-login-to-user-link" to="/login" style={S.link}>
            Worker Login
          </Link>
        </div>
      </div>
    </div>
  );
}

const S = {
  wrap: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at top,#1e1b4b 0%,#0b0f1e 60%,#080b14 100%)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif",
  },
  card: {
    width: "100%", maxWidth: 440,
    background: "rgba(19,24,41,0.85)", backdropFilter: "blur(16px)",
    borderRadius: 18, padding: "36px 32px",
    border: "1px solid #2d3660",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 28 },
  logo: {
    width: 44, height: 44, borderRadius: 11,
    background: "linear-gradient(135deg,#5b7cff,#7b5cf7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: 0.5,
    boxShadow: "0 4px 16px rgba(91,124,255,0.4)",
  },
  brand: { fontWeight: 800, fontSize: 17, color: "#dde3f5" },
  sub: { fontSize: 11, color: "#5b7cff", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" },
  h: { fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 6px" },
  p: { fontSize: 13, color: "#6b7899", margin: "0 0 24px" },
  label: { display: "grid", gap: 6, fontSize: 11, fontWeight: 700, color: "#9ca3c9", textTransform: "uppercase", letterSpacing: "0.06em" },
  input: {
    padding: "12px 14px", borderRadius: 10, border: "1.5px solid #2d3660",
    fontSize: 14, color: "#dde3f5", outline: "none", fontWeight: 500,
    background: "#080b14", transition: "border-color .15s",
  },
  btn: {
    marginTop: 8, padding: "13px 18px", borderRadius: 11, border: "none",
    background: "linear-gradient(135deg,#5b7cff,#7b5cf7)",
    color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
    boxShadow: "0 4px 20px rgba(91,124,255,0.35)",
  },
  err: { padding: "10px 12px", borderRadius: 9, background: "rgba(255,95,126,0.1)", color: "#ff5f7e", fontSize: 13, fontWeight: 600, border: "1px solid rgba(255,95,126,0.3)" },
  foot: { marginTop: 24, fontSize: 13, color: "#6b7899", textAlign: "center" },
  link: { color: "#5b7cff", fontWeight: 700, textDecoration: "none" },
};
