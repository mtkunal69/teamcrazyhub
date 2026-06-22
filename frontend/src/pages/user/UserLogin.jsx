import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { WORKER_TYPES } from "@/lib/api";

export default function UserLogin() {
  const { loginUser } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [name, setName] = useState("");
  const [tg, setTg] = useState("");
  const [wt, setWt] = useState("5 ID Worker");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "login") {
        await loginUser(u, p);
      } else {
        if (!name.trim() || !tg.trim() || !u.trim() || !p.trim()) {
          setErr("Fill all fields"); setLoading(false); return;
        }
        const { data } = await api.post("/auth/user/register", {
          username: u, password: p, name, telegram: tg, default_worker_type: wt,
        });
        localStorage.setItem("tch_token", data.token);
        localStorage.setItem("tch_user", JSON.stringify(data));
        window.dispatchEvent(new Event("auth:login"));
      }
      nav("/app");
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed");
    } finally { setLoading(false); }
  }

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.brandRow}>
          <div style={S.logo}>TC</div>
          <div>
            <div style={S.brand}>TeamCrazy Hub</div>
            <div style={S.sub}>{mode === "login" ? "Worker Login" : "Create Account"}</div>
          </div>
        </div>
        <h2 style={S.h}>{mode === "login" ? "Sign In" : "Sign Up"}</h2>
        <p style={S.p}>{mode === "login" ? "Use your TeamCrazy username & password" : "Create your account in 30 seconds"}</p>

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          {mode === "signup" && (
            <>
              <label style={S.label}>
                <span>Full Name</span>
                <input data-testid="signup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Sharma" style={S.input} />
              </label>
              <label style={S.label}>
                <span>Telegram @username</span>
                <input data-testid="signup-telegram" value={tg} onChange={(e) => setTg(e.target.value)} placeholder="@yourname" style={S.input} />
              </label>
            </>
          )}
          <label style={S.label}>
            <span>{mode === "login" ? "Username" : "Choose a Username"}</span>
            <input data-testid="user-login-username" value={u} onChange={(e) => setU(e.target.value)} placeholder="rahul123" style={S.input} autoComplete="username" />
          </label>
          <label style={S.label}>
            <span>{mode === "login" ? "Password" : "Choose a Password (min 6 chars)"}</span>
            <input data-testid="user-login-password" type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="••••••••" style={S.input} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>
          {mode === "signup" && (
            <label style={S.label}>
              <span>Default Worker Type</span>
              <select data-testid="signup-worker-type" value={wt} onChange={(e) => setWt(e.target.value)} style={S.input}>
                {WORKER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
          )}
          {err && <div data-testid="user-login-error" style={S.err}>{err}</div>}
          <button data-testid="user-login-submit" type="submit" disabled={loading} style={S.btn}>
            {loading ? "..." : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>

        <div style={S.foot}>
          {mode === "login" ? (
            <>New worker? <button type="button" onClick={() => { setMode("signup"); setErr(""); }} style={S.linkBtn}>Create Account</button></>
          ) : (
            <>Already have account? <button type="button" onClick={() => { setMode("login"); setErr(""); }} style={S.linkBtn}>Sign In</button></>
          )}
          <div style={{ marginTop: 8 }}>Admin? <Link to="/admin/login" style={S.link}>Admin Login</Link></div>
        </div>
      </div>
    </div>
  );
}

const S = {
  wrap: { minHeight: "100vh", background: "linear-gradient(135deg,#eff6ff 0%,#dbeafe 50%,#eef2ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif" },
  card: { width: "100%", maxWidth: 460, background: "#fff", borderRadius: 18, padding: "36px 32px", boxShadow: "0 20px 60px rgba(30,64,175,0.15)", border: "1px solid #e0e7ff" },
  brandRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 28 },
  logo: { width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 16 },
  brand: { fontWeight: 800, fontSize: 17, color: "#0f172a" },
  sub: { fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" },
  h: { fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" },
  p: { fontSize: 14, color: "#64748b", margin: "0 0 24px" },
  label: { display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#334155" },
  input: { padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#0f172a", outline: "none", fontWeight: 500 },
  btn: { marginTop: 8, padding: "13px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 16px rgba(29,78,216,0.3)" },
  err: { padding: "10px 12px", borderRadius: 9, background: "#fef2f2", color: "#b91c1c", fontSize: 13, fontWeight: 600, border: "1px solid #fecaca" },
  foot: { marginTop: 22, fontSize: 13, color: "#64748b", textAlign: "center" },
  link: { color: "#1d4ed8", fontWeight: 700, textDecoration: "none" },
  linkBtn: { background: "none", border: "none", color: "#1d4ed8", fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 },
};
