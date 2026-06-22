import { Link } from "react-router-dom";

const FEATURES = [
  { icon: "🧠", title: "AI Member Verification", desc: "Auto-counts Telegram usernames from screen recordings." },
  { icon: "🧮", title: "Automatic Salary", desc: "Computed instantly from verified count and worker type." },
  { icon: "⭐", title: "Premium Detection", desc: "Premium badges are tracked while counting all members." },
  { icon: "📄", title: "Daily Reports", desc: "Comprehensive performance reports every day at 12 PM." },
  { icon: "🎥", title: "Video Proof", desc: "MP4 / MOV / AVI recordings processed frame-by-frame." },
  { icon: "📨", title: "Telegram Sync", desc: "Auto reports dispatched to your admin Telegram group." },
];

const STEPS = [
  "Login with Name and Telegram Username",
  "Select Worker Type",
  "Enter Total Members",
  "Upload Screen Recording Proof",
  "AI Counts Members",
  "Salary Calculated Automatically",
  "Daily Report Generated",
];

export default function Landing() {
  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans',-apple-system,sans-serif", color: "#0f172a" }}>
      {/* Nav */}
      <nav style={{ padding: "18px 32px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>TC</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>TeamCrazy Hub</div>
            <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>AI Salary Verification</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link data-testid="nav-check-salary-btn" to="/login" style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", padding: "9px 20px", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Check Salary</Link>
          <Link data-testid="nav-admin-btn" to="/admin/login" style={{ background: "#f1f5f9", color: "#475569", padding: "9px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Admin</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "80px 32px", textAlign: "center", maxWidth: 980, margin: "0 auto" }}>
        <span style={{ display: "inline-block", background: "#dbeafe", color: "#1d4ed8", padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700, marginBottom: 24 }}>✨ Powered by AI Vision</span>
        <h1 style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
          AI Powered Salary Verification<br />
          <span style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>& Reporting System</span>
        </h1>
        <p style={{ fontSize: 18, color: "#475569", maxWidth: 700, margin: "0 auto 36px", lineHeight: 1.6 }}>
          Verify daily performance, upload proof, and calculate salary automatically with AI-powered Telegram member counting.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link data-testid="hero-check-salary-btn" to="/login" style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", padding: "15px 32px", borderRadius: 12, fontWeight: 800, fontSize: 15, textDecoration: "none", boxShadow: "0 8px 24px rgba(29,78,216,0.35)" }}>Check Salary →</Link>
          <Link data-testid="hero-admin-btn" to="/admin/login" style={{ background: "#fff", color: "#1d4ed8", padding: "15px 32px", borderRadius: 12, fontWeight: 800, fontSize: 15, textDecoration: "none", border: "2px solid #bfdbfe" }}>Admin Console</Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "60px 32px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 8px" }}>Everything You Need</h2>
          <p style={{ fontSize: 16, color: "#64748b" }}>Six powerful capabilities in one platform</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} data-testid={`feature-card-${i}`} style={{ background: "#fff", padding: 26, borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 1px 8px rgba(15,23,42,0.04)" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.55 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section style={{ background: "#fff", padding: "60px 32px", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 36, fontWeight: 900, margin: "0 0 8px" }}>How It Works</h2>
            <p style={{ fontSize: 16, color: "#64748b" }}>Seven simple steps to verified salary</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ background: "#f8fafc", padding: 18, borderRadius: 12, display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#3b82f6)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{i + 1}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ padding: 28, textAlign: "center", color: "#94a3b8", fontSize: 12, borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
        © {new Date().getFullYear()} TeamCrazy Hub · AI Salary Verification System
      </footer>
    </div>
  );
}
