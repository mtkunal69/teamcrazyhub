import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, fmtRupee, fmtDate, WORKER_TYPES, WORKER_COLORS } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function UserDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [charts, setCharts] = useState({});
  const [myReports, setMyReports] = useState([]);
  const [myLinks, setMyLinks] = useState([]);
  const [tab, setTab] = useState("submit");

  const reload = async () => {
    const [c, r, l] = await Promise.all([
      api.get("/charts"),
      api.get("/reports/me"),
      api.get("/links/me"),
    ]);
    setCharts(c.data);
    setMyReports(r.data);
    setMyLinks(l.data);
  };

  useEffect(() => {
    reload();
    const t = setInterval(reload, 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", color: "#0f172a" }}>
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

      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 28px", display: "flex", gap: 4, overflowX: "auto" }}>
        {[
          ["submit", "💰 Submit Work"],
          ["links", "🔗 My Channel Links"],
          ["chart", "📊 Salary Chart"],
          ["history", "📋 My Reports"],
        ].map(([id, label]) => (
          <button key={id} data-testid={`user-tab-${id}`} onClick={() => setTab(id)} style={{
            padding: "14px 18px", background: "none", border: "none", borderBottom: `2px solid ${tab === id ? "#1d4ed8" : "transparent"}`,
            color: tab === id ? "#1d4ed8" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
          }}>{label}</button>
        ))}
      </div>

      <main style={{ padding: "28px", maxWidth: 1200, margin: "0 auto" }}>
        {tab === "submit" && <SubmitTab charts={charts} myLinks={myLinks} onSubmitted={reload} onCreateLink={() => setTab("links")} />}
        {tab === "links" && <LinksTab links={myLinks} onChange={reload} />}
        {tab === "chart" && <ChartTab charts={charts} />}
        {tab === "history" && <HistoryTab rows={myReports} />}
      </main>
    </div>
  );
}

function SubmitTab({ charts, myLinks, onSubmitted, onCreateLink }) {
  const [wt, setWt] = useState(WORKER_TYPES[0]);
  const [linkId, setLinkId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { if (myLinks.length === 1 && !linkId) setLinkId(myLinks[0].id); }, [myLinks, linkId]);

  const selectedLink = myLinks.find(l => l.id === linkId);

  async function submit() {
    setErr(""); setResult(null);
    if (!linkId) { setErr("Choose your channel link"); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post("/reports", { worker_type: wt, link_id: linkId });
      setResult(data);
      onSubmitted();
    } catch (e) {
      setErr(e.response?.data?.detail || "Submission failed");
    } finally { setSubmitting(false); }
  }

  const col = WORKER_COLORS[wt];
  const liveSlabs = charts[wt] || [];

  if (myLinks.length === 0) {
    return (
      <div style={{ background: "#fff", borderRadius: 14, padding: 40, border: "1px solid #e2e8f0", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔗</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>No channel link yet</h2>
        <p style={{ color: "#64748b", margin: "0 0 24px", maxWidth: 480, marginInline: "auto", lineHeight: 1.6 }}>
          Generate your unique Telegram invite link first. Members who join your channel via this link will be automatically counted and salary will be calculated.
        </p>
        <button data-testid="create-first-link-btn" onClick={onCreateLink} style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", border: "none", padding: "13px 28px", borderRadius: 11, fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 16px rgba(29,78,216,0.3)" }}>
          Generate My Link →
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 22 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 26, border: "1px solid #e2e8f0" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Submit Daily Work</h2>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 22px" }}>Member count is fetched directly from your Telegram invite link — 100% accurate.</p>

        <div style={{ display: "grid", gap: 16 }}>
          <label style={lbl}>
            <span>Worker Type</span>
            <select data-testid="submit-worker-type" value={wt} onChange={(e) => setWt(e.target.value)} style={{ ...inp, borderLeft: `4px solid ${col}` }}>
              {WORKER_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>

          <label style={lbl}>
            <span>Channel Invite Link</span>
            <select data-testid="submit-link-select" value={linkId} onChange={(e) => setLinkId(e.target.value)} style={inp}>
              <option value="">-- Choose your link --</option>
              {myLinks.map((l) => (
                <option key={l.id} value={l.id}>{l.channel_title} · {l.members_joined} joined</option>
              ))}
            </select>
          </label>

          {selectedLink && (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              <div style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Live from Telegram</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>{selectedLink.channel_title}</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: "#1d4ed8" }}>{selectedLink.members_joined}</span>
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>members joined via your link</div>
            </div>
          )}

          {err && <div data-testid="submit-error" style={{ padding: "10px 12px", borderRadius: 9, background: "#fef2f2", color: "#b91c1c", fontSize: 13, fontWeight: 600, border: "1px solid #fecaca" }}>{err}</div>}

          <button data-testid="submit-work-btn" disabled={submitting || !linkId} onClick={submit} style={{ ...btnPrimary, opacity: submitting || !linkId ? 0.6 : 1 }}>
            {submitting ? "Submitting..." : "Calculate & Submit Salary →"}
          </button>
        </div>

        {result && (
          <div data-testid="submit-result" style={{ marginTop: 22, padding: 20, borderRadius: 12, background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#047857" }}>✓ VERIFIED · Real Telegram Count</div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{fmtDate(result.created_at)}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
              <Stat label="Members Joined" value={result.ai_count} />
              <Stat label="Worker Type" value={result.worker_type} />
              <Stat label="Slab" value={result.slab_label || "—"} />
              <Stat label="Salary" value={fmtRupee(result.salary)} highlight />
            </div>
          </div>
        )}
      </div>

      <div style={{ background: "#fff", borderRadius: 14, padding: 26, border: "1px solid #e2e8f0", height: "fit-content" }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 16px", color: col }}>{wt} · Salary Slabs</h3>
        <div style={{ display: "grid", gap: 8 }}>
          {liveSlabs.filter((s) => s.enabled).map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", background: "#f8fafc", borderRadius: 9, border: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.label} members</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: s.salary > 0 ? col : "#94a3b8" }}>{fmtRupee(s.salary)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LinksTab({ links, onChange }) {
  const [channels, setChannels] = useState([]);
  const [channelId, setChannelId] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    api.get("/channels/available").then((r) => setChannels(r.data));
  }, []);

  async function create() {
    setErr("");
    if (!channelId) { setErr("Choose a channel"); return; }
    setCreating(true);
    try {
      await api.post("/links/create", { channel_id: channelId, name: name.trim() || null });
      setChannelId(""); setName("");
      onChange();
    } catch (e) {
      setErr(e.response?.data?.detail || "Could not create link");
    } finally { setCreating(false); }
  }

  async function del(lid) {
    if (!window.confirm("Delete this link? It will be revoked on Telegram too.")) return;
    await api.delete(`/links/${lid}`);
    onChange();
  }

  function copy(url, id) {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div>
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderLeft: "3px solid #1d4ed8", borderRadius: 11, padding: 16, marginBottom: 22 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: "#1d4ed8", marginBottom: 8 }}>📋 How it works</div>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
          <li>Choose a channel from the admin's list below</li>
          <li>Click <b>Generate Link</b> — you get a unique invite link</li>
          <li>Share that link wherever you want to invite people</li>
          <li>Joins are auto-counted · leaves are tracked too</li>
          <li>Salary is calculated on <b>net active members</b> (yesterday at 10 AM)</li>
        </ol>
      </div>

      <div style={{ background: "#fff", padding: 22, borderRadius: 12, border: "1px solid #e2e8f0", marginBottom: 22 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 14px" }}>Generate New Invite Link</h3>
        {channels.length === 0 ? (
          <div style={{ padding: 18, background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 9, color: "#92400e", fontSize: 13, fontWeight: 600 }}>
            ⚠ No channels available. Admin needs to add channels first.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr auto", gap: 10, alignItems: "end" }}>
              <label style={lbl}>
                <span>Channel</span>
                <select data-testid="link-channel-select" value={channelId} onChange={(e) => setChannelId(e.target.value)} style={inp}>
                  <option value="">-- Choose channel --</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>{c.title} ({c.type || "channel"})</option>
                  ))}
                </select>
              </label>
              <label style={lbl}>
                <span>Link Name (optional)</span>
                <input data-testid="link-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Campaign 1" style={inp} />
              </label>
              <button data-testid="link-create-btn" disabled={creating} onClick={create} style={{ ...btnPrimary, height: 44 }}>
                {creating ? "Creating..." : "Generate →"}
              </button>
            </div>
            {err && <div data-testid="link-error" style={{ marginTop: 10, padding: "9px 12px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", fontSize: 13, fontWeight: 600, border: "1px solid #fecaca" }}>{err}</div>}
          </>
        )}
      </div>

      <h3 style={{ fontSize: 15, fontWeight: 800, color: "#334155", margin: "0 0 12px" }}>Your Links ({links.length})</h3>
      {links.length === 0 ? (
        <div style={{ background: "#fff", padding: 36, textAlign: "center", color: "#94a3b8", borderRadius: 12, border: "1px solid #e2e8f0" }}>No links yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {links.map((l) => <LinkRow key={l.id} l={l} copied={copied} onCopy={copy} onDelete={del} />)}
        </div>
      )}
    </div>
  );
}

function LinkRow({ l, copied, onCopy, onDelete }) {
  const [details, setDetails] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && !details) {
      api.get(`/links/${l.id}/members`).then((r) => setDetails(r.data));
    }
  }, [open, l.id, details]);
  return (
    <div data-testid={`link-row-${l.id}`} style={{ background: "#fff", padding: 18, borderRadius: 12, border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{l.channel_title}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{l.link_name} · Created {fmtDate(l.created_at)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#10b981" }}>{l.members_joined}</div>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Joins</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
        <code style={{ flex: 1, fontSize: 12, color: "#0f172a", wordBreak: "break-all", fontFamily: "monospace" }}>{l.link_url}</code>
        <button data-testid={`link-copy-${l.id}`} onClick={() => onCopy(l.link_url, l.id)} style={{ padding: "6px 12px", background: copied === l.id ? "#10b981" : "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{copied === l.id ? "✓ Copied" : "📋 Copy"}</button>
        <button data-testid={`link-toggle-${l.id}`} onClick={() => setOpen((p) => !p)} style={{ padding: "6px 10px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>{open ? "▴" : "▾"}</button>
        <button data-testid={`link-delete-${l.id}`} onClick={() => onDelete(l.id)} style={{ padding: "6px 10px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 6, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>✕</button>
      </div>
      {open && details && (
        <div style={{ marginTop: 10, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 10, fontSize: 12, fontWeight: 700 }}>
            <span style={{ color: "#10b981" }}>✓ Active: {details.active}</span>
            <span style={{ color: "#ef4444" }}>✕ Left: {details.left}</span>
          </div>
          <div style={{ maxHeight: 200, overflow: "auto", display: "grid", gap: 4 }}>
            {details.members.slice(0, 30).map((m, i) => (
              <div key={i} style={{ fontSize: 12, padding: "5px 8px", background: m.left_at ? "#fef2f2" : "#ecfdf5", borderRadius: 6, color: m.left_at ? "#991b1b" : "#047857" }}>
                {m.first_name || m.username || `User ${m.telegram_user_id}`} {m.left_at && <span style={{ fontSize: 10, marginLeft: 6 }}>(left)</span>}
              </div>
            ))}
          </div>
        </div>
      )}
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
  if (rows.length === 0) return <div style={{ background: "#fff", padding: 50, textAlign: "center", color: "#94a3b8", borderRadius: 14, border: "1px solid #e2e8f0" }}>No submissions yet.</div>;
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#f8fafc" }}>
          <tr>
            {["Date", "Type", "Channel", "Members", "Salary", "Source"].map((h) => (
              <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-testid={`history-row-${r.id}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={td}>{fmtDate(r.created_at)}</td>
              <td style={{ ...td, color: WORKER_COLORS[r.worker_type], fontWeight: 700 }}>{r.worker_type}</td>
              <td style={td}>{r.channel_title || "—"}</td>
              <td style={td}>{r.ai_count}</td>
              <td style={{ ...td, fontWeight: 800, color: r.salary > 0 ? "#10b981" : "#94a3b8" }}>{fmtRupee(r.salary)}</td>
              <td style={td}>
                <span style={{ padding: "3px 9px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: r.source === "INVITE_LINK" ? "#d1fae5" : "#fef3c7", color: r.source === "INVITE_LINK" ? "#047857" : "#92400e" }}>
                  {r.source === "INVITE_LINK" ? "🔗 Live" : "✋ Manual"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const lbl = { display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#334155" };
const inp = { padding: "11px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none", background: "#fff", color: "#0f172a" };
const btnPrimary = { padding: "13px 18px", borderRadius: 11, border: "none", background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 16px rgba(29,78,216,0.3)" };
const td = { padding: "12px 16px", fontSize: 13, color: "#334155" };
