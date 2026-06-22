import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtRupee, fmtDate, WORKER_TYPES, WORKER_COLORS } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [charts, setCharts] = useState({});
  const [myReports, setMyReports] = useState([]);
  const [tab, setTab] = useState("submit");

  const reload = async () => {
    const [c, r] = await Promise.all([api.get("/charts"), api.get("/reports/me")]);
    setCharts(c.data);
    setMyReports(r.data);
  };

  useEffect(() => {
    reload();
    const t = setInterval(reload, 8000); // poll for live admin changes
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", color: "#0f172a" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>TC</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>TeamCrazy Hub</div>
            <div style={{ fontSize: 11, color: "#64748b" }} data-testid="user-greeting">Hi, {user?.name} • {user?.telegram}</div>
          </div>
        </div>
        <button data-testid="user-logout-btn" onClick={() => { logout(); nav("/"); }} style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 9, padding: "8px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Logout</button>
      </header>

      {/* Tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 28px", display: "flex", gap: 4 }}>
        {[
          ["submit", "Submit Work"],
          ["chart", "Salary Chart"],
          ["history", "My Reports"],
        ].map(([id, label]) => (
          <button key={id} data-testid={`user-tab-${id}`} onClick={() => setTab(id)} style={{
            padding: "14px 18px", background: "none", border: "none", borderBottom: `2px solid ${tab === id ? "#1d4ed8" : "transparent"}`,
            color: tab === id ? "#1d4ed8" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      <main style={{ padding: "28px", maxWidth: 1100, margin: "0 auto" }}>
        {tab === "submit" && <SubmitTab charts={charts} onSubmitted={reload} />}
        {tab === "chart" && <ChartTab charts={charts} />}
        {tab === "history" && <HistoryTab rows={myReports} />}
      </main>
    </div>
  );
}

function SubmitTab({ charts, onSubmitted }) {
  const [wt, setWt] = useState(WORKER_TYPES[0]);
  const [count, setCount] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [stage, setStage] = useState("");

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { setErr("Video too large — max 50 MB"); return; }
    setFile(f);
    setErr("");
  };

  async function submit() {
    setErr("");
    const n = parseInt(count);
    if (isNaN(n) || n < 0) { setErr("Enter a valid member count"); return; }
    if (!file) { setErr("Please upload a screen recording proof"); return; }
    setSubmitting(true);
    setResult(null);
    setStage("📤 Uploading video to AI...");
    try {
      const fd = new FormData();
      fd.append("worker_type", wt);
      fd.append("member_count", String(n));
      fd.append("video", file);
      setStage("🧠 AI is analyzing video — counting members (this may take 30-60 sec)...");
      const { data } = await api.post("/reports", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 240000,
      });
      setResult(data);
      onSubmitted();
      setFile(null);
      setCount("");
    } catch (e) {
      setErr(e.response?.data?.detail || e.message || "Submission failed");
    } finally {
      setSubmitting(false);
      setStage("");
    }
  }

  const col = WORKER_COLORS[wt];
  const liveSlabs = charts[wt] || [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 22 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 26, border: "1px solid #e2e8f0" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Submit Daily Work</h2>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 22px" }}>AI will verify your screen recording and compute salary instantly.</p>

        <div style={{ display: "grid", gap: 16 }}>
          <label style={lbl}>
            <span>Worker Type</span>
            <select data-testid="submit-worker-type" value={wt} onChange={(e) => setWt(e.target.value)} style={{ ...inp, borderLeft: `4px solid ${col}` }}>
              {WORKER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label style={lbl}>
            <span>Total Members Added Today</span>
            <input data-testid="submit-member-count" type="number" min="0" value={count} onChange={(e) => setCount(e.target.value)} placeholder="e.g. 85" style={inp} />
          </label>
          <label style={lbl}>
            <span>Screen Recording (MP4 / MOV / AVI · max 50 MB)</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <label style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: "1.5px dashed #cbd5e1", textAlign: "center", cursor: "pointer", background: "#f8fafc", color: file ? "#0f172a" : "#94a3b8", fontWeight: 600, fontSize: 13 }}>
                {file ? `📹 ${file.name} (${(file.size/1024/1024).toFixed(1)} MB)` : "📂 Click to choose video..."}
                <input data-testid="submit-video-input" type="file" accept="video/*" onChange={onFile} style={{ display: "none" }} />
              </label>
            </div>
          </label>
          {err && <div data-testid="submit-error" style={{ padding: "10px 12px", borderRadius: 9, background: "#fef2f2", color: "#b91c1c", fontSize: 13, fontWeight: 600, border: "1px solid #fecaca" }}>{err}</div>}
          {stage && <div data-testid="submit-stage" style={{ padding: "10px 12px", borderRadius: 9, background: "#eff6ff", color: "#1d4ed8", fontSize: 13, fontWeight: 600, border: "1px solid #bfdbfe" }}>{stage}</div>}
          <button data-testid="submit-work-btn" disabled={submitting} onClick={submit} style={{ ...btnPrimary, opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Processing..." : "Verify & Submit →"}
          </button>
        </div>

        {result && (
          <div data-testid="submit-result" style={{ marginTop: 22, padding: 20, borderRadius: 12, background: result.status === "VERIFIED" ? "#ecfdf5" : "#fef2f2", border: `1px solid ${result.status === "VERIFIED" ? "#a7f3d0" : "#fecaca"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: result.status === "VERIFIED" ? "#047857" : "#b91c1c" }}>
                {result.status === "VERIFIED" ? "✓ VERIFIED" : "⚠ MISMATCH COUNTING"}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{fmtDate(result.created_at)}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 14 }}>
              <Stat label="Your Count" value={result.member_count} />
              <Stat label="AI Count" value={result.ai_count} />
              <Stat label="Slab" value={result.slab_label || "—"} />
              <Stat label="Salary" value={fmtRupee(result.salary)} highlight />
            </div>
            <div style={{ fontSize: 11, color: "#64748b", padding: "8px 10px", background: "rgba(255,255,255,0.6)", borderRadius: 6, fontWeight: 600 }}>
              {result.ai_source === "GEMINI"
                ? `🧠 Real AI (Gemini Flash) · confidence: ${result.ai_confidence}`
                : "🎲 Mock AI (configure Gemini in admin for real vision)"}
              {result.ai_error && ` · ⚠ ${result.ai_error}`}
            </div>
          </div>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 26, border: "1px solid #e2e8f0", height: "fit-content" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
          <span style={{ fontSize: 10, color: "#10b981", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Live from Admin</span>
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px", color: col }}>{wt} · Salary Slabs</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {liveSlabs.filter((s) => s.enabled).map((s) => (
            <div key={s.id} data-testid={`live-slab-${s.id}`} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", background: "#f8fafc", borderRadius: 9, border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.label} members</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: s.salary > 0 ? col : "#94a3b8" }}>{fmtRupee(s.salary)}</span>
            </div>
          ))}
          {liveSlabs.filter((s) => s.enabled).length === 0 && <div style={{ color: "#94a3b8", fontSize: 13, padding: 14, textAlign: "center" }}>No active slabs</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 9, padding: "10px 12px", border: "1px solid rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: highlight ? 18 : 15, fontWeight: 800, color: highlight ? "#047857" : "#0f172a" }}>{value}</div>
    </div>
  );
}

function ChartTab({ charts }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
      {WORKER_TYPES.map((wt) => {
        const col = WORKER_COLORS[wt];
        const slabs = charts[wt] || [];
        return (
          <div key={wt} data-testid={`chart-card-${wt}`} style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #e2e8f0", borderTop: `4px solid ${col}` }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800, color: col }}>{wt}</h3>
            <div style={{ display: "grid", gap: 6 }}>
              {slabs.map((s) => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", background: s.enabled ? "#f8fafc" : "#fef2f2", borderRadius: 8, fontSize: 13, opacity: s.enabled ? 1 : 0.6 }}>
                  <span style={{ fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontWeight: 800, color: s.salary > 0 ? col : "#94a3b8" }}>{fmtRupee(s.salary)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryTab({ rows }) {
  if (rows.length === 0) return <div style={{ background: "#fff", padding: 50, textAlign: "center", color: "#94a3b8", borderRadius: 14, border: "1px solid #e2e8f0" }}>No submissions yet. Submit your first work to see it here.</div>;
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f8fafc" }}>
          <tr>
            {["Date", "Type", "Your Count", "AI Count", "Salary", "Status"].map((h) => (
              <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isV = r.status === "VERIFIED";
            return (
              <tr key={r.id} data-testid={`history-row-${r.id}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={td}>{fmtDate(r.created_at)}</td>
                <td style={{ ...td, color: WORKER_COLORS[r.worker_type], fontWeight: 700 }}>{r.worker_type}</td>
                <td style={td}>{r.member_count}</td>
                <td style={td}>{r.ai_count}</td>
                <td style={{ ...td, fontWeight: 800, color: r.salary > 0 ? "#10b981" : "#94a3b8" }}>{fmtRupee(r.salary)}</td>
                <td style={td}>
                  <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: isV ? "#d1fae5" : "#fee2e2", color: isV ? "#047857" : "#b91c1c" }}>{isV ? "✓ Verified" : "⚠ Mismatch"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const lbl = { display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#334155" };
const inp = { padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", background: "#fff", color: "#0f172a" };
const btnPrimary = { marginTop: 4, padding: "13px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 16px rgba(29,78,216,0.3)" };
const td = { padding: "12px 16px", fontSize: 13, color: "#334155" };
