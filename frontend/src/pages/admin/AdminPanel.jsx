import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtRupee, fmtDate, WORKER_TYPES, WORKER_COLORS } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const C = {
  bg: "#080b14", surface: "#0e1220", card: "#131829", cardHover: "#181e30",
  border: "#1f2640", borderLit: "#2d3660", accent: "#5b7cff", accentDim: "rgba(91,124,255,0.12)",
  green: "#10d97e", greenDim: "rgba(16,217,126,0.1)", red: "#ff5f7e", redDim: "rgba(255,95,126,0.1)",
  amber: "#ffb020", amberDim: "rgba(255,176,32,0.1)", purple: "#b47fff", purpleDim: "rgba(180,127,255,0.1)",
  cyan: "#22d3ee", text: "#dde3f5", muted: "#6b7899",
};

const NAV = [
  { id: "dashboard", icon: "🏠", label: "Dashboard" },
  { id: "reports", icon: "📋", label: "Staff Reports" },
  { id: "charts", icon: "📊", label: "Salary Charts" },
  { id: "channels", icon: "📺", label: "Channels" },
  { id: "simulator", icon: "🧮", label: "Simulator" },
  { id: "audit", icon: "🔍", label: "Audit Log" },
  { id: "telegram", icon: "📨", label: "Telegram Bot" },
];

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [page, setPage] = useState("dashboard");
  const [sideOpen, setSide] = useState(true);
  const [toast, setToast] = useState(null);
  const [charts, setCharts] = useState({});

  const reloadCharts = useCallback(async () => {
    const { data } = await api.get("/charts");
    setCharts(data);
  }, []);

  useEffect(() => { reloadCharts(); }, [reloadCharts]);

  const showToast = (msg, type = "success") => setToast({ msg, type, id: Date.now() });
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  const pageTitle = NAV.find((n) => n.id === page)?.label || "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: sideOpen ? 240 : 70, background: C.surface, borderRight: `1px solid ${C.border}`, transition: "width .2s", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: 11, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#5b7cff,#7b5cf7)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>TC</div>
          {sideOpen && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>TeamCrazy</div>
              <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, letterSpacing: "0.08em" }}>ADMIN</div>
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: 10, display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map((n) => {
            const active = page === n.id;
            return (
              <button key={n.id} data-testid={`admin-nav-${n.id}`} onClick={() => setPage(n.id)} style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 9,
                background: active ? C.accentDim : "transparent",
                border: `1px solid ${active ? C.accent + "40" : "transparent"}`,
                color: active ? C.accent : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer",
                textAlign: "left", transition: "all .15s",
              }}>
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                {sideOpen && <span>{n.label}</span>}
              </button>
            );
          })}
        </nav>
        <button onClick={() => setSide((p) => !p)} data-testid="admin-sidebar-toggle" style={{ margin: "10px 12px", padding: "9px 10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 9, color: C.muted, cursor: "pointer", fontSize: 12 }}>
          {sideOpen ? "◀ Collapse" : "▶"}
        </button>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{pageTitle}</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}` }} /> LIVE
            </div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }} data-testid="admin-current-user">{user?.name}</div>
            <button data-testid="admin-logout-btn" onClick={() => { logout(); nav("/admin/login"); }} style={{ background: C.card, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Logout</button>
          </div>
        </header>

        <main style={{ flex: 1, padding: 28, overflowY: "auto" }}>
          {page === "dashboard" && <Dashboard charts={charts} onNav={setPage} />}
          {page === "reports" && <Reports />}
          {page === "charts" && <Charts charts={charts} reload={reloadCharts} showToast={showToast} />}
          {page === "simulator" && <Simulator charts={charts} />}
          {page === "audit" && <Audit />}
          {page === "telegram" && <TelegramSettings showToast={showToast} />}
          {page === "channels" && <ChannelsAdmin showToast={showToast} /> }
        </main>
      </div>

      {toast && (
        <div data-testid="admin-toast" style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 18px", borderRadius: 10, background: C.card, border: `1px solid ${toast.type === "success" ? C.green : toast.type === "error" ? C.red : C.amber}`, color: toast.type === "success" ? C.green : toast.type === "error" ? C.red : C.amber, fontWeight: 700, fontSize: 13, boxShadow: "0 10px 30px rgba(0,0,0,0.4)", zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────
function Dashboard({ charts, onNav }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data));
    const t = setInterval(() => api.get("/dashboard/stats").then((r) => setStats(r.data)), 6000);
    return () => clearInterval(t);
  }, []);
  if (!stats) return <div style={{ color: C.muted }}>Loading...</div>;

  const cards = [
    { label: "Total Reports", value: stats.total_reports, sub: "All time", col: C.accent, icon: "📋" },
    { label: "Today", value: stats.today_reports, sub: "Submissions today", col: C.cyan, icon: "📅" },
    { label: "Total Paid", value: fmtRupee(stats.total_paid), sub: "Across all staff", col: C.green, icon: "💰" },
    { label: "Verified", value: stats.verified, sub: `${Math.round((stats.verified / Math.max(stats.total_reports,1)) * 100)}% success`, col: C.green, icon: "✅" },
    { label: "Mismatches", value: stats.mismatch, sub: "Need review", col: C.red, icon: "⚠️" },
    { label: "Active Slabs", value: stats.active_slabs, sub: "Across 4 types", col: C.purple, icon: "⚙️" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 6px" }}>Dashboard</h1>
      <p style={{ color: C.muted, margin: "0 0 24px", fontSize: 13 }}>Live overview of all staff activity and salary payouts.</p>

      <div data-testid="dashboard-stat-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 28 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, borderLeft: `3px solid ${c.col}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{c.label}</span>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: c.col, marginBottom: 4 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 16px" }}>Submissions by Worker Type</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {stats.by_type.map((t) => {
              const pct = stats.total_reports ? Math.round((t.count / stats.total_reports) * 100) : 0;
              return (
                <div key={t.worker_type}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: WORKER_COLORS[t.worker_type], fontWeight: 700 }}>{t.worker_type} · {t.count}</span>
                    <span style={{ color: C.muted, fontWeight: 700 }}>{fmtRupee(t.paid)} · {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: C.bg, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: WORKER_COLORS[t.worker_type], transition: "width .3s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Recent Submissions</h3>
            <button onClick={() => onNav("reports")} style={{ background: "none", border: "none", color: C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>View All →</button>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {stats.recent.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: C.bg }}>
                <div style={{ width: 30, height: 30, borderRadius: 7, background: WORKER_COLORS[r.worker_type] + "20", color: WORKER_COLORS[r.worker_type], fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{r.worker_type[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{r.name}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{r.telegram} · {r.member_count} members</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: r.salary > 0 ? C.green : C.muted }}>{fmtRupee(r.salary)}</div>
              </div>
            ))}
            {stats.recent.length === 0 && <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 20 }}>No submissions yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REPORTS ─────────────────────────────────────────────────
function Reports() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [fwt, setFwt] = useState("ALL");
  const [fst, setFst] = useState("ALL");
  const load = () => {
    const params = {};
    if (search) params.search = search;
    if (fwt !== "ALL") params.worker_type = fwt;
    if (fst !== "ALL") params.status = fst;
    api.get("/reports", { params }).then((r) => setRows(r.data));
  };
  useEffect(() => { load(); }, [search, fwt, fst]);

  function exportCSV() {
    const hdr = ["Name", "Telegram", "Worker Type", "Members", "AI Count", "Salary", "Status", "Date"];
    const lines = [hdr, ...rows.map((r) => [r.name, r.telegram, r.worker_type, r.member_count, r.ai_count, r.salary, r.status, fmtDate(r.created_at)])];
    const csv = lines.map((l) => l.map((v) => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "teamcrazy_reports.csv";
    a.click();
  }

  async function exportWeeklyXLSX() {
    try {
      const token = localStorage.getItem("tch_token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reports/export/weekly?days=7`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert("Export failed"); return; }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = /filename="?([^"]+)"?/.exec(cd);
      const filename = m ? m[1] : `teamcrazy_weekly_${new Date().toISOString().slice(0,10)}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Download failed: " + e.message);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 4px" }}>Staff Reports</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>All salary submissions with AI verification results.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button data-testid="export-csv-btn" onClick={exportCSV} style={{ ...btnGhost, color: C.accent, borderColor: C.accent + "40" }}>⬇ Export CSV</button>
          <button data-testid="export-weekly-xlsx-btn" onClick={exportWeeklyXLSX} style={{ ...btnGhost, color: C.green, borderColor: C.green + "40" }}>📊 Weekly Excel Report</button>
        </div>
      </div>

      <div style={{ background: C.card, padding: 14, borderRadius: 10, border: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, marginBottom: 14 }}>
        <input data-testid="reports-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or @telegram..." style={dkInp} />
        <select data-testid="reports-filter-wt" value={fwt} onChange={(e) => setFwt(e.target.value)} style={dkInp}>
          <option value="ALL">All Types</option>
          {WORKER_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select data-testid="reports-filter-status" value={fst} onChange={(e) => setFst(e.target.value)} style={dkInp}>
          <option value="ALL">All Status</option>
          <option>VERIFIED</option>
          <option>MISMATCH COUNTING</option>
        </select>
        <button onClick={() => { setSearch(""); setFwt("ALL"); setFst("ALL"); }} style={btnGhost}>✕ Clear</button>
      </div>

      <div style={{ background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: C.surface }}>
            <tr>
              {["Staff", "Type", "Entered", "AI Count", "Salary", "Status", "Date"].map((h) => (
                <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: C.muted }}>No reports match your filters.</td></tr>}
            {rows.map((r) => {
              const isV = r.status === "VERIFIED";
              const col = WORKER_COLORS[r.worker_type];
              return (
                <tr key={r.id} data-testid={`report-row-${r.id}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={dkTd}><div style={{ fontWeight: 700 }}>{r.name}</div><div style={{ fontSize: 11, color: C.muted }}>{r.telegram}</div></td>
                  <td style={{ ...dkTd, color: col, fontWeight: 700, fontSize: 12 }}>{r.worker_type}</td>
                  <td style={dkTd}>{r.member_count}</td>
                  <td style={dkTd}>{r.ai_count}</td>
                  <td style={{ ...dkTd, fontWeight: 800, color: r.salary > 0 ? C.green : C.muted }}>{fmtRupee(r.salary)}</td>
                  <td style={dkTd}>
                    <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: isV ? C.greenDim : C.redDim, color: isV ? C.green : C.red }}>{isV ? "✓ Verified" : "⚠ Mismatch"}</span>
                  </td>
                  <td style={{ ...dkTd, fontSize: 11, color: C.muted }}>{fmtDate(r.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CHARTS (CRUD) ───────────────────────────────────────────
function Charts({ charts, reload, showToast }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(null);

  async function reset() {
    if (!window.confirm("Reset ALL salary charts to defaults? This deletes custom slabs.")) return;
    await api.post("/charts/reset");
    await reload();
    showToast("All charts reset to defaults", "amber");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 4px" }}>Salary Charts</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>All salary calculations read live from this database.</p>
        </div>
        <button data-testid="charts-reset-btn" onClick={reset} style={{ ...btnGhost, color: C.amber, borderColor: C.amber + "40" }}>↺ Reset Defaults</button>
      </div>

      {WORKER_TYPES.map((wt) => (
        <ChartPanel key={wt} workerType={wt} slabs={charts[wt] || []} onEdit={setEditing} onAdd={() => setAdding(wt)} reload={reload} showToast={showToast} />
      ))}

      {(editing || adding) && (
        <SlabModal
          slab={editing}
          workerType={editing?.worker_type || adding}
          isNew={!editing}
          onClose={() => { setEditing(null); setAdding(null); }}
          onSaved={async () => { await reload(); setEditing(null); setAdding(null); showToast(editing ? "✓ Slab updated" : "✓ Slab added"); }}
        />
      )}
    </div>
  );
}

function ChartPanel({ workerType, slabs, onEdit, onAdd, reload, showToast }) {
  const col = WORKER_COLORS[workerType];
  const active = slabs.filter((s) => s.enabled).length;

  async function toggle(s) {
    await api.patch(`/charts/slab/${s.id}/toggle`);
    await reload();
    showToast(`${s.enabled ? "⏸ Disabled" : "▶ Enabled"} ${s.label}`, "amber");
  }
  async function del(s) {
    if (!window.confirm(`Delete slab "${s.label}" (₹${s.salary})?`)) return;
    await api.delete(`/charts/slab/${s.id}`);
    await reload();
    showToast(`✕ Deleted ${s.label}`, "error");
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${col}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: col }}>{workerType}</div>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{active}/{slabs.length} active</div>
        </div>
        <button data-testid={`add-slab-${workerType}`} onClick={onAdd} style={{ ...btnGhost, color: col, borderColor: col + "40" }}>＋ Add Slab</button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["#", "Range", "Salary", "Status", "Actions"].map((h) => (
              <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slabs.map((s, i) => (
            <tr key={s.id} data-testid={`slab-row-${s.id}`} style={{ borderBottom: `1px solid ${C.border}`, opacity: s.enabled ? 1 : 0.45 }}>
              <td style={{ ...dkTd, color: C.muted, fontSize: 11 }}>{i + 1}</td>
              <td style={{ ...dkTd, fontWeight: 700 }}>{s.label} <span style={{ color: C.muted, fontWeight: 500, fontSize: 11 }}>members</span></td>
              <td style={{ ...dkTd, fontWeight: 800, color: s.salary > 0 ? C.green : C.muted }}>{fmtRupee(s.salary)}</td>
              <td style={dkTd}>
                <span style={{ padding: "3px 9px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: s.enabled ? C.greenDim : C.redDim, color: s.enabled ? C.green : C.red }}>{s.enabled ? "● Active" : "○ Off"}</span>
              </td>
              <td style={dkTd}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button data-testid={`edit-slab-${s.id}`} onClick={() => onEdit(s)} style={miniBtn(C.accent)}>✏ Edit</button>
                  <button data-testid={`toggle-slab-${s.id}`} onClick={() => toggle(s)} style={miniBtn(C.amber)}>{s.enabled ? "⏸" : "▶"}</button>
                  <button data-testid={`delete-slab-${s.id}`} onClick={() => del(s)} style={miniBtn(C.red)}>✕</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlabModal({ slab, workerType, isNew, onClose, onSaved }) {
  const [mn, setMn] = useState(slab ? String(slab.min) : "");
  const [mx, setMx] = useState(slab && slab.max !== null ? String(slab.max) : "");
  const [sal, setSal] = useState(slab ? String(slab.salary) : "");
  const [unlimited, setUnlim] = useState(slab ? slab.max === null : false);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const min_ = parseInt(mn), max_ = unlimited ? null : parseInt(mx), salary_ = parseInt(sal);
    if (isNaN(min_) || min_ < 0) return setErr("Min must be ≥ 0");
    if (!unlimited && (isNaN(max_) || max_ <= min_)) return setErr("Max must be > Min");
    if (isNaN(salary_) || salary_ < 0) return setErr("Salary must be ≥ 0");
    setSaving(true);
    try {
      if (isNew) {
        await api.post("/charts/slab", { worker_type: workerType, min: min_, max: max_, salary: salary_, enabled: true });
      } else {
        await api.put(`/charts/slab/${slab.id}`, { min: min_, max: unlimited ? null : max_, unlimited, salary: salary_ });
      }
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  }

  return (
    <div style={modalBg} onClick={onClose}>
      <div data-testid="slab-modal" onClick={(e) => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 26, width: "100%", maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{isNew ? "Add New Slab" : "Edit Slab"}</div>
            <div style={{ fontSize: 11, color: WORKER_COLORS[workerType], fontWeight: 700 }}>{workerType}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <Field label="Min Members" v={mn} onChange={(v) => { setMn(v); setErr(""); }} />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>Max Members</span>
              <label style={{ fontSize: 11, color: C.muted, display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                <input data-testid="slab-unlimited-checkbox" type="checkbox" checked={unlimited} onChange={(e) => setUnlim(e.target.checked)} style={{ accentColor: C.accent }} /> No limit (+)
              </label>
            </div>
            {unlimited ? <div style={{ padding: "11px 14px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.muted, fontSize: 13 }}>Unlimited (∞)</div>
              : <input data-testid="slab-max-input" value={mx} onChange={(e) => { setMx(e.target.value); setErr(""); }} placeholder="e.g. 74" style={dkInp} />}
          </div>
          <Field label="Salary (₹)" v={sal} onChange={(v) => { setSal(v); setErr(""); }} />
          {err && <div style={{ padding: "9px 12px", borderRadius: 8, background: C.redDim, color: C.red, fontSize: 12, fontWeight: 700 }}>⚠ {err}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button data-testid="slab-save-btn" onClick={save} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>{saving ? "Saving..." : isNew ? "Add Slab" : "Save Changes"}</button>
            <button onClick={onClose} style={btnGhost}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, v, onChange }) {
  return (
    <label style={{ display: "grid", gap: 5 }}>
      <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>{label}</span>
      <input data-testid={`slab-${label.toLowerCase().replace(/[^a-z]/g,"")}-input`} value={v} onChange={(e) => onChange(e.target.value)} style={dkInp} />
    </label>
  );
}

// ─── SIMULATOR ───────────────────────────────────────────────
function Simulator({ charts }) {
  const [wt, setWt] = useState(WORKER_TYPES[0]);
  const [cnt, setCnt] = useState("");
  const [res, setRes] = useState(null);
  function calc() {
    const n = parseInt(cnt);
    if (isNaN(n)) return;
    const list = charts[wt] || [];
    const row = list.find((s) => s.enabled && n >= s.min && (s.max === null || n <= s.max));
    setRes({ salary: row ? row.salary : 0, slab: row ? row.label : "No match", n, wt });
  }
  const col = WORKER_COLORS[wt];
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 4px" }}>Salary Simulator</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 24px" }}>Test salary calculation against the live database.</p>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22, display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end", marginBottom: 18 }}>
        <label style={{ display: "grid", gap: 5 }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>Worker Type</span>
          <select data-testid="sim-worker-type" value={wt} onChange={(e) => { setWt(e.target.value); setRes(null); }} style={dkInp}>
            {WORKER_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 5 }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>Member Count</span>
          <input data-testid="sim-count-input" value={cnt} onChange={(e) => { setCnt(e.target.value); setRes(null); }} type="number" placeholder="e.g. 85" style={dkInp} />
        </label>
        <button data-testid="sim-calculate-btn" onClick={calc} style={btnPrimary}>Calculate →</button>
      </div>
      {res && (
        <div data-testid="sim-result" style={{ background: C.card, border: `1px solid ${col}40`, borderLeft: `4px solid ${col}`, borderRadius: 12, padding: 22 }}>
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{res.wt} · {res.n} members</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Matched slab: {res.slab}</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: res.salary > 0 ? C.green : C.muted }}>{fmtRupee(res.salary)}</div>
        </div>
      )}
    </div>
  );
}

// ─── AUDIT ───────────────────────────────────────────────────
function Audit() {
  const [log, setLog] = useState([]);
  const [filter, setFilter] = useState("ALL");
  useEffect(() => { api.get("/audit", { params: filter === "ALL" ? {} : { action: filter } }).then((r) => setLog(r.data)); }, [filter]);

  const acts = ["ALL", "EDIT", "ADD", "DELETE", "DISABLE", "ENABLE", "RESET"];
  const colMap = { EDIT: C.accent, ADD: C.green, DELETE: C.red, DISABLE: C.amber, ENABLE: C.green, RESET: C.purple };

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 4px" }}>Audit Log</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 18px" }}>Every salary chart change — admin, before, after, when.</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {acts.map((a) => (
          <button key={a} data-testid={`audit-filter-${a}`} onClick={() => setFilter(a)} style={{
            padding: "5px 14px", borderRadius: 20, fontSize: 10, fontWeight: 700, cursor: "pointer",
            border: `1px solid ${filter === a ? C.accent : C.border}`,
            background: filter === a ? C.accentDim : "transparent",
            color: filter === a ? C.accent : C.muted,
          }}>{a}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.muted }}>{log.length} entries</span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {log.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.muted, background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>No audit entries yet.</div>}
        {log.map((e) => {
          const c = colMap[e.action] || C.accent;
          return (
            <div key={e.id} data-testid={`audit-entry-${e.id}`} style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${c}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                <span style={{ padding: "3px 9px", borderRadius: 5, fontSize: 10, fontWeight: 800, background: c + "20", color: c }}>{e.action}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{e.worker_type}</span>
                {e.slab_label && <span style={{ fontSize: 11, color: C.muted }}>· {e.slab_label}</span>}
              </div>
              {e.old_value && <div style={{ fontSize: 11, color: C.red, marginBottom: 2 }}>Before: {e.old_value}</div>}
              {e.new_value && <div style={{ fontSize: 11, color: C.green, marginBottom: 6 }}>After: {e.new_value}</div>}
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>👤 {e.admin_name} · {fmtDate(e.created_at)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TELEGRAM SETTINGS ───────────────────────────────────────
function TelegramSettings({ showToast }) {
  const [cfg, setCfg] = useState({ bot_token: "", chat_id: "", enabled: false, notify_on_report: true, daily_summary: true });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get("/settings/telegram").then((r) => setCfg(r.data));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.put("/settings/telegram", cfg);
      showToast("✓ Telegram settings saved");
    } catch (e) {
      showToast("Failed to save", "error");
    } finally { setSaving(false); }
  }

  async function test() {
    setTesting(true);
    try {
      await api.put("/settings/telegram", cfg); // save first
      const { data } = await api.post("/settings/telegram/test");
      if (data.ok) showToast("✓ Test message delivered to Telegram", "success");
      else showToast(`✕ ${data.error || "Test failed"}`, "error");
    } catch (e) {
      showToast(e.response?.data?.detail || "Test failed", "error");
    } finally { setTesting(false); }
  }

  async function sendDailyNow() {
    if (!window.confirm("Send today's salary summary to Telegram right now?")) return;
    try {
      await api.post("/settings/telegram/send-daily-now");
      showToast("✓ Daily summary sent", "success");
    } catch (e) {
      showToast(e.response?.data?.detail || "Send failed", "error");
    }
  }

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));

  async function setupWebhook() {
    try {
      const { data } = await api.post("/settings/telegram/setup-webhook");
      if (data.ok) {
        showToast(`✓ Webhook registered: bot @${data.bot_username}`);
      } else {
        showToast(`✕ ${data.error || "Setup failed"}`, "error");
      }
    } catch (e) {
      showToast(e.response?.data?.detail || "Setup failed", "error");
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 4px" }}>📨 Telegram Bot</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 24px" }}>Real-time member counting via invite link tracking. 100% accurate · No video needed.</p>

      {/* How-to */}
      <div style={{ background: C.accentDim, border: `1px solid ${C.accent}40`, borderLeft: `3px solid ${C.accent}`, borderRadius: 10, padding: 16, marginBottom: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.accent, marginBottom: 8 }}>⚡ Quick Setup (2 minutes)</div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.text, lineHeight: 1.8 }}>
          <li>Open Telegram → search <b>@BotFather</b> → send <code style={codeS}>/newbot</code> → follow prompts → copy the <b>Bot Token</b></li>
          <li>Create a Telegram group (or use existing) → add your new bot as member → make it admin</li>
          <li>Send any message in the group, then open <code style={codeS}>https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> in browser → copy the <code style={codeS}>chat.id</code> (group IDs start with <code style={codeS}>-100</code>)</li>
          <li>Paste both below, toggle <b>Enable</b>, hit <b>Save & Test</b></li>
        </ol>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, display: "grid", gap: 16, maxWidth: 720 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Bot Token</span>
          <input
            data-testid="tg-bot-token-input"
            value={cfg.bot_token}
            onChange={(e) => set("bot_token", e.target.value)}
            placeholder="123456789:ABCdefGHI_jklMNO..."
            type="password"
            style={dkInp}
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Chat ID (group or personal)</span>
          <input
            data-testid="tg-chat-id-input"
            value={cfg.chat_id}
            onChange={(e) => set("chat_id", e.target.value)}
            placeholder="-1001234567890"
            style={dkInp}
          />
        </label>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "grid", gap: 10 }}>
          <Toggle data-testid="tg-enabled" label="Enable Telegram bot" sub="Master switch — turn off to silence everything" v={cfg.enabled} onChange={(v) => set("enabled", v)} />
          <Toggle data-testid="tg-notify-on-report" label="Instant notification on every new report" sub="Sends a message the moment a worker submits" v={cfg.notify_on_report} onChange={(v) => set("notify_on_report", v)} />
          <Toggle data-testid="tg-daily-summary" label="Daily salary chart at 12:00 PM IST" sub="Consolidated report of last 24h sent to your group" v={cfg.daily_summary} onChange={(v) => set("daily_summary", v)} />
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
          <button data-testid="tg-save-btn" onClick={save} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>{saving ? "Saving..." : "💾 Save"}</button>
          <button data-testid="tg-test-btn" onClick={test} disabled={testing || !cfg.bot_token || !cfg.chat_id} style={{ ...btnGhost, color: C.green, borderColor: C.green + "40", flex: 1, padding: "9px 18px" }}>{testing ? "Sending..." : "🧪 Save & Send Test Message"}</button>
        </div>
        <button data-testid="tg-send-daily-now-btn" onClick={sendDailyNow} disabled={!cfg.enabled} style={{ ...btnGhost, color: C.amber, borderColor: C.amber + "40", padding: "9px 18px" }}>📊 Send Today's Daily Summary Now (manual trigger)</button>
        <button data-testid="tg-setup-webhook-btn" onClick={setupWebhook} disabled={!cfg.bot_token} style={{ ...btnGhost, color: C.purple, borderColor: C.purple + "40", padding: "9px 18px" }}>🔌 Register Webhook (required for link tracking)</button>
      </div>
      <ConnectedChannels />
    </div>
  );
}

function ConnectedChannels() {
  const [chs, setChs] = useState([]);
  const [links, setLinks] = useState([]);
  useEffect(() => {
    const load = () => Promise.all([api.get("/channels"), api.get("/links")]).then(([c, l]) => {
      setChs(c.data); setLinks(l.data);
    });
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ marginTop: 28 }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px" }}>📺 Connected Channels ({chs.length})</h3>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 22 }}>
        {chs.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 18 }}>
            No channels yet. Add bot as admin to a channel → it'll appear here automatically.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {chs.map((c) => (
              <div key={c.chat_id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: C.bg, borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{c.username ? "@" + c.username : c.chat_id} · {c.type} · {c.bot_status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 12px" }}>🔗 All Staff Links ({links.length})</h3>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "auto" }}>
        {links.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12, textAlign: "center", padding: 24 }}>No links generated yet by staff.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: C.surface }}>
              <tr>
                {["Staff", "Channel", "Members Joined", "Link Created"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {links.map((l) => (
                <tr key={l.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={dkTd}>
                    <div style={{ fontWeight: 700 }}>{l.staff_name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{l.staff_telegram}</div>
                  </td>
                  <td style={dkTd}>{l.channel_title}</td>
                  <td style={{ ...dkTd, fontWeight: 800, color: C.green, fontSize: 16 }}>{l.members_joined}</td>
                  <td style={{ ...dkTd, fontSize: 11, color: C.muted }}>{new Date(l.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, sub, v, onChange, ...rest }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>}
      </div>
      <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
        <input {...rest} type="checkbox" checked={v} onChange={(e) => onChange(e.target.checked)} style={{ display: "none" }} />
        <div style={{ width: 42, height: 24, borderRadius: 12, background: v ? C.accent : C.border, position: "relative", transition: "background .2s" }}>
          <div style={{ position: "absolute", top: 2, left: v ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
        </div>
      </label>
    </div>
  );
}

const codeS = { background: C.bg, padding: "1px 6px", borderRadius: 4, fontSize: 11, color: C.accent, fontFamily: "monospace" };

// ─── CHANNELS ADMIN ──────────────────────────────────────────
function ChannelsAdmin({ showToast }) {
  const [chs, setChs] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [titleOv, setTitleOv] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");

  const reload = () => api.get("/channels").then((r) => setChs(r.data));
  useEffect(() => { reload(); }, []);

  async function add() {
    setErr("");
    if (!chatInput.trim() && !linkInput.trim()) { setErr("Provide chat_id OR invite link"); return; }
    setAdding(true);
    try {
      await api.post("/channels", {
        chat_id: chatInput.trim() || null,
        invite_link: linkInput.trim() || null,
        title_override: titleOv.trim() || null,
      });
      setChatInput(""); setLinkInput(""); setTitleOv("");
      reload();
      showToast("✓ Channel added");
    } catch (e) {
      setErr(e.response?.data?.detail || "Could not add channel");
    } finally { setAdding(false); }
  }

  async function toggleEnabled(c) {
    await api.put(`/channels/${c.id}`, { enabled: !c.enabled });
    reload();
    showToast(c.enabled ? "Channel disabled" : "Channel enabled", "amber");
  }

  async function editTitle(c) {
    const newTitle = window.prompt("New display title:", c.title);
    if (!newTitle) return;
    await api.put(`/channels/${c.id}`, { title_override: newTitle });
    reload();
    showToast("Updated", "success");
  }

  async function del(c) {
    if (!window.confirm(`Delete "${c.title}"? All staff links + member data for this channel will be removed.`)) return;
    await api.delete(`/channels/${c.id}`);
    reload();
    showToast("Channel removed", "error");
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 4px" }}>📺 Channels</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Manage Telegram channels where staff generate invite links.</p>
        </div>
      </div>

      <div style={{ background: C.accentDim, border: `1px solid ${C.accent}40`, borderLeft: `3px solid ${C.accent}`, borderRadius: 10, padding: 16, marginBottom: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.accent, marginBottom: 8 }}>How to add a channel</div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.text, lineHeight: 1.8 }}>
          <li>Add the bot as <b>Admin</b> in your Telegram channel with <b>"Invite Users"</b> permission</li>
          <li>Below, enter either: <b>Chat ID</b> (e.g. <code style={codeS}>-1001234567890</code>) OR <b>Invite Link</b> (e.g. <code style={codeS}>https://t.me/yourchannel</code>)</li>
          <li>Get chat ID from <code style={codeS}>@userinfobot</code> after forwarding any message from your channel to it</li>
        </ol>
      </div>

      <div style={{ background: C.card, padding: 18, borderRadius: 11, border: `1px solid ${C.border}`, marginBottom: 22 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 12px" }}>Add New Channel</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>Chat ID</span>
            <input data-testid="ch-chatid-input" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="-1001234567890 or @username" style={dkInp} />
          </label>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>OR Invite Link</span>
            <input data-testid="ch-invitelink-input" value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="https://t.me/channelname" style={dkInp} />
          </label>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 700 }}>Display Title (optional)</span>
            <input data-testid="ch-title-input" value={titleOv} onChange={(e) => setTitleOv(e.target.value)} placeholder="Friendly name" style={dkInp} />
          </label>
          <button data-testid="ch-add-btn" disabled={adding} onClick={add} style={{ ...btnPrimary, height: 38 }}>{adding ? "Adding..." : "+ Add"}</button>
        </div>
        {err && <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 7, background: C.redDim, color: C.red, fontSize: 12, fontWeight: 600 }}>{err}</div>}
      </div>

      <div style={{ background: C.card, borderRadius: 11, border: `1px solid ${C.border}`, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: C.surface }}>
            <tr>
              {["Channel", "Chat ID", "Type", "Bot Status", "Enabled", "Actions"].map((h) => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chs.length === 0 && <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: C.muted }}>No channels yet</td></tr>}
            {chs.map((c) => (
              <tr key={c.id} data-testid={`channel-row-${c.id}`} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={dkTd}>
                  <div style={{ fontWeight: 700 }}>{c.title}</div>
                  {c.username && <div style={{ fontSize: 11, color: C.muted }}>@{c.username}</div>}
                </td>
                <td style={{ ...dkTd, fontFamily: "monospace", fontSize: 11 }}>{c.chat_id}</td>
                <td style={dkTd}>{c.type || "—"}</td>
                <td style={dkTd}>
                  <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: c.bot_status === "administrator" ? C.greenDim : C.amberDim, color: c.bot_status === "administrator" ? C.green : C.amber }}>
                    {c.bot_status || "unknown"}
                  </span>
                </td>
                <td style={dkTd}>
                  <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: c.enabled !== false ? C.greenDim : C.redDim, color: c.enabled !== false ? C.green : C.red }}>
                    {c.enabled !== false ? "● Active" : "○ Disabled"}
                  </span>
                </td>
                <td style={dkTd}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button data-testid={`ch-edit-${c.id}`} onClick={() => editTitle(c)} style={miniBtn(C.accent)}>✎</button>
                    <button data-testid={`ch-toggle-${c.id}`} onClick={() => toggleEnabled(c)} style={miniBtn(C.amber)}>{c.enabled !== false ? "⏸" : "▶"}</button>
                    <button data-testid={`ch-delete-${c.id}`} onClick={() => del(c)} style={miniBtn(C.red)}>✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── shared styles ───────────────────────────────────────────
function GeminiSettings({ showToast }) {
  const [cfg, setCfg] = useState({ api_key: "", model: "gemini-2.5-flash", enabled: false });
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get("/settings/gemini").then((r) => {
      // Don't overwrite api_key with masked version — keep editable field empty if already set
      setCfg({ api_key: "", model: r.data.model || "gemini-2.5-flash", enabled: !!r.data.enabled });
      setHasKey(!!r.data.api_key_masked);
    });
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload = { ...cfg };
      // If user didn't enter a new key, don't overwrite existing
      if (!cfg.api_key && hasKey) {
        delete payload.api_key;
        // Need to fetch existing key — better: just don't send api_key field
      }
      // Since backend requires api_key in model, send what we have
      await api.put("/settings/gemini", { ...cfg, api_key: cfg.api_key || "" });
      showToast("✓ Gemini settings saved");
      if (cfg.api_key) setHasKey(true);
    } catch (e) {
      showToast(e.response?.data?.detail || "Save failed", "error");
    } finally { setSaving(false); }
  }

  async function test() {
    setTesting(true);
    try {
      await api.put("/settings/gemini", { ...cfg, api_key: cfg.api_key || "" });
      const { data } = await api.post("/settings/gemini/test");
      if (data.ok) showToast("✓ Gemini API key working", "success");
      else showToast(`✕ ${data.error || "Test failed"}`, "error");
    } catch (e) {
      showToast(e.response?.data?.detail || "Test failed", "error");
    } finally { setTesting(false); }
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 4px" }}>🧠 Gemini AI (Video Vision)</h1>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 24px" }}>Real AI-powered member counting from screen recordings. Same video = same count.</p>

      <div style={{ background: C.accentDim, border: `1px solid ${C.accent}40`, borderLeft: `3px solid ${C.accent}`, borderRadius: 10, padding: 16, marginBottom: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.accent, marginBottom: 8 }}>⚡ Get Free Gemini API Key (2 minutes)</div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.text, lineHeight: 1.8 }}>
          <li>Open <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: C.accent, fontWeight: 700 }}>aistudio.google.com/app/apikey</a> and sign in with Google</li>
          <li>Click <b>"Create API key"</b> → choose "Create API key in new project"</li>
          <li>Copy the key (starts with <code style={codeS}>AIza...</code>)</li>
          <li>Paste below + toggle <b>Enable</b> + hit <b>Save & Test</b></li>
        </ol>
        <div style={{ marginTop: 10, padding: "6px 10px", background: C.bg, borderRadius: 6, fontSize: 11, color: C.muted }}>
          💡 Free tier: ~1500 video analyses/day · No credit card needed
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, display: "grid", gap: 16, maxWidth: 720 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Gemini API Key</span>
            {hasKey && <span style={{ fontSize: 10, color: C.green, fontWeight: 700 }}>✓ Key saved (enter new key only to replace)</span>}
          </div>
          <input
            data-testid="gemini-api-key-input"
            value={cfg.api_key}
            onChange={(e) => setCfg({ ...cfg, api_key: e.target.value })}
            placeholder={hasKey ? "(saved — leave blank to keep)" : "AIzaSyA..."}
            type="password"
            style={dkInp}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Model</span>
          <select data-testid="gemini-model-select" value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} style={dkInp}>
            <option value="gemini-2.5-flash">gemini-2.5-flash (recommended · fast · free tier)</option>
            <option value="gemini-2.0-flash">gemini-2.0-flash (stable)</option>
            <option value="gemini-2.5-pro">gemini-2.5-pro (more accurate · slower)</option>
          </select>
        </label>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <Toggle data-testid="gemini-enabled" label="Enable Real AI Vision" sub="When ON, uses Gemini for actual member counting. When OFF, falls back to mock." v={cfg.enabled} onChange={(v) => setCfg({ ...cfg, enabled: v })} />
        </div>

        <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
          <button data-testid="gemini-save-btn" onClick={save} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>{saving ? "Saving..." : "💾 Save"}</button>
          <button data-testid="gemini-test-btn" onClick={test} disabled={testing} style={{ ...btnGhost, color: C.green, borderColor: C.green + "40", flex: 1, padding: "9px 18px" }}>{testing ? "Testing..." : "🧪 Save & Test API Key"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── shared styles ───────────────────────────────────────────
const dkInp = { padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12, color: C.text, background: C.bg, outline: "none", fontWeight: 500 };
const dkTd = { padding: "11px 14px", fontSize: 12, color: C.text };
const btnPrimary = { padding: "9px 18px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#5b7cff,#7b5cf7)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" };
const btnGhost = { padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, fontSize: 11, cursor: "pointer" };
const miniBtn = (col) => ({ padding: "5px 10px", borderRadius: 6, border: `1px solid ${col}40`, background: col + "15", color: col, fontWeight: 700, fontSize: 11, cursor: "pointer" });
const modalBg = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 };
