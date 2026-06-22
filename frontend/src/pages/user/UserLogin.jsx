import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function UserLogin() {
  const { loginUser } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [tg, setTg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!name.trim() || !tg.trim()) {
      setErr("Both fields required");
      return;
    }
    setLoading(true);
    try {
      await loginUser(name.trim(), tg.trim());
      nav("/app");
    } catch (e) {
      setErr(e.response?.data?.detail || "Login failed");
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
            <div style={S.sub}>Worker Login</div>
          </div>
        </div>
        <h2 style={S.h}>Welcome Back</h2>
        <p style={S.p}>Sign in with your name and Telegram username</p>

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <label style={S.label}>
            <span>Full Name</span>
            <input
              data-testid="user-login-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              style={S.input}
            />
          </label>
          <label style={S.label}>
            <span>Telegram Username</span>
            <input
              data-testid="user-login-telegram-input"
              value={tg}
              onChange={(e) => setTg(e.target.value)}
              placeholder="@yourname"
              style={S.input}
            />
          </label>
          {err && (
            <div data-testid="user-login-error" style={S.err}>
              {err}
            </div>
          )}
          <button data-testid="user-login-submit" type="submit" disabled={loading} style={S.btn}>
            {loading ? "Signing in..." : "Continue →"}
          </button>
        </form>

        <div style={S.foot}>
          Admin?{" "}
          <Link data-testid="user-login-to-admin-link" to="/admin/login" style={S.link}>
            Admin Login
          </Link>
        </div>
      </div>
    </div>
  );
}

const S = {
  wrap: {
    minHeight: "100vh",
    background: "linear-gradient(135deg,#eff6ff 0%,#dbeafe 50%,#eef2ff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    background: "#fff",
    borderRadius: 18,
    padding: "36px 32px",
    boxShadow: "0 20px 60px rgba(30,64,175,0.15)",
    border: "1px solid #e0e7ff",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 28 },
  logo: {
    width: 44, height: 44, borderRadius: 11,
    background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: 0.5,
  },
  brand: { fontWeight: 800, fontSize: 17, color: "#0f172a" },
  sub: { fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" },
  h: { fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" },
  p: { fontSize: 14, color: "#64748b", margin: "0 0 24px" },
  label: { display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#334155" },
  input: {
    padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0",
    fontSize: 14, color: "#0f172a", outline: "none", fontWeight: 500,
    transition: "border-color .15s",
  },
  btn: {
    marginTop: 8, padding: "13px 18px", borderRadius: 11, border: "none",
    background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
    color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
    boxShadow: "0 4px 16px rgba(29,78,216,0.3)",
  },
  err: { padding: "10px 12px", borderRadius: 9, background: "#fef2f2", color: "#b91c1c", fontSize: 13, fontWeight: 600, border: "1px solid #fecaca" },
  foot: { marginTop: 24, fontSize: 13, color: "#64748b", textAlign: "center" },
  link: { color: "#1d4ed8", fontWeight: 700, textDecoration: "none" },
};
