"use client";

import { useState } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────── */
interface OfferResult {
  verdict: "Fair" | "Below market" | "Above market" | "Strong offer";
  explanation: string;
  baseVsMarket: { yourBase: number; marketMedian: number; percentageDiff: number };
  percentile: number;
  growthScore: number;
  benefitsAssessment: string;
  whatIsGood: string[];
  whatToNegotiate: string[];
  negotiationScript: string;
}

/* ─── Helpers ───────────────────────────────────── */
const VERDICT_STYLE: Record<string, { bg: string; color: string }> = {
  "Fair":           { bg: "#FDE68A",  color: "#8a7200" },
  "Below market":   { bg: "#C4B5FD",  color: "#5b3fa8" },
  "Above market":   { bg: "#00C9A7",  color: "#1B3A35" },
  "Strong offer":   { bg: "#1B3A35",  color: "#00C9A7" },
};

function formatINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const CITIES = ["Bangalore", "Mumbai", "Delhi NCR", "Hyderabad", "Pune", "Chennai", "Kolkata", "Remote"];
const STAGES = ["Seed", "Series A", "Series B", "Series C", "Late stage / Pre-IPO", "Listed"];

/* ─── Metric Card ───────────────────────────────── */
function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 14, padding: "16px 18px" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>{value}</p>
      <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{sub}</p>
    </div>
  );
}

/* ─── Collapsible Section ───────────────────────── */
function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 14, overflow: "hidden" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "none", border: "none", cursor: "pointer" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{title}</span>
        <span style={{ fontSize: 12, color: "#888" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <div style={{ padding: "0 18px 16px", borderTop: "1px solid #f0f0f0" }}>{children}</div>}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
export default function OfferPage() {
  const [form, setForm] = useState({
    company: "",
    role: "",
    baseSalary: "",
    totalCTC: "",
    variablePercent: "",
    stage: "Series B",
    location: "Bangalore",
    experience: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OfferResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptOpen, setScriptOpen] = useState(false);

  const f = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleEvaluate = async () => {
    if (!form.company || !form.role || !form.baseSalary || !form.totalCTC) {
      setError("Please fill in company, role, base salary, and total CTC.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/offer-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, baseSalary: Number(form.baseSalary), totalCTC: Number(form.totalCTC), variablePercent: Number(form.variablePercent || 0), experience: Number(form.experience || 0) }),
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data = await res.json() as OfferResult;
      setResult(data);
    } catch {
      setError("Evaluation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const verdictStyle = result ? (VERDICT_STYLE[result.verdict] ?? VERDICT_STYLE["Fair"]) : VERDICT_STYLE["Fair"];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>Is this offer good?</h1>
        <p style={{ fontSize: 14, color: "#888", margin: 0 }}>Paste your offer details. We&apos;ll tell you exactly where you stand.</p>
      </div>

      {/* Form */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label className="label">Company</label><input className="input" value={form.company} onChange={(e) => f("company", e.target.value)} placeholder="Razorpay" style={{ width: "100%", boxSizing: "border-box" }} /></div>
          <div><label className="label">Role</label><input className="input" value={form.role} onChange={(e) => f("role", e.target.value)} placeholder="Senior Product Manager" style={{ width: "100%", boxSizing: "border-box" }} /></div>
          <div>
            <label className="label">Base salary (₹ / yr)</label>
            <input type="number" className="input" value={form.baseSalary} onChange={(e) => f("baseSalary", e.target.value)} placeholder="2500000" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label className="label">Total CTC (₹ / yr)</label>
            <input type="number" className="input" value={form.totalCTC} onChange={(e) => f("totalCTC", e.target.value)} placeholder="3500000" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label className="label">Variable %</label>
            <input type="number" className="input" value={form.variablePercent} onChange={(e) => f("variablePercent", e.target.value)} placeholder="15" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label className="label">Years of experience</label>
            <input type="number" className="input" value={form.experience} onChange={(e) => f("experience", e.target.value)} placeholder="4" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <label className="label">Company stage</label>
            <select className="input" value={form.stage} onChange={(e) => f("stage", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Location</label>
            <select className="input" value={form.location} onChange={(e) => f("location", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {error && <p style={{ fontSize: 13, color: "#ff6b6b", margin: 0 }}>{error}</p>}

        <button className="btn-primary" onClick={handleEvaluate} disabled={loading} style={{ opacity: loading ? 0.6 : 1, width: "100%" }}>
          {loading ? "Evaluating offer…" : "Evaluate this offer →"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Verdict */}
          <div style={{ backgroundColor: verdictStyle.bg, borderRadius: 16, padding: "24px 28px", textAlign: "center" }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: verdictStyle.color, margin: "0 0 8px" }}>{result.verdict}</p>
            <p style={{ fontSize: 14, color: verdictStyle.color + "cc", margin: 0 }}>{result.explanation}</p>
          </div>

          {/* 4 metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <MetricCard
              label="Base vs Market"
              value={`${formatINR(result.baseVsMarket.yourBase)} vs ${formatINR(result.baseVsMarket.marketMedian)}`}
              sub={result.baseVsMarket.percentageDiff >= 0 ? `${result.baseVsMarket.percentageDiff}% above market median` : `${Math.abs(result.baseVsMarket.percentageDiff)}% below market median`}
            />
            <MetricCard
              label="CTC Percentile"
              value={`Top ${100 - result.percentile}%`}
              sub={`${result.percentile}th percentile for this role, city, and stage`}
            />
            <MetricCard
              label="Growth Potential"
              value={`${result.growthScore}/10`}
              sub="Career and compensation growth score"
            />
            <MetricCard
              label="Benefits"
              value={result.benefitsAssessment}
              sub="Overall package assessment"
            />
          </div>

          {/* What's good */}
          <Collapsible title="✓ What's good about this offer">
            <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {result.whatIsGood.map((g, i) => (
                <li key={i} style={{ fontSize: 13, color: "#333", display: "flex", gap: 8 }}><span style={{ color: "#00C9A7", flexShrink: 0 }}>✓</span>{g}</li>
              ))}
            </ul>
          </Collapsible>

          {/* What to negotiate */}
          <Collapsible title="→ What to negotiate">
            <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
              {result.whatToNegotiate.map((n, i) => (
                <li key={i} style={{ fontSize: 13, color: "#333", display: "flex", gap: 8 }}><span style={{ color: "#FDE68A", flexShrink: 0 }}>→</span>{n}</li>
              ))}
            </ul>
          </Collapsible>

          {/* Negotiation script */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 14 }}>
            <button onClick={() => setScriptOpen((o) => !o)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "none", border: "none", cursor: "pointer" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>✉ Here&apos;s how to ask for more →</span>
              <span style={{ fontSize: 12, color: "#888" }}>{scriptOpen ? "▲" : "▼"}</span>
            </button>
            {scriptOpen && (
              <div style={{ padding: "0 18px 18px", borderTop: "1px solid #f0f0f0" }}>
                <div style={{ backgroundColor: "#f8fffe", border: "1px solid #00C9A733", borderRadius: 10, padding: 16, marginTop: 12 }}>
                  <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.8, margin: 0, fontStyle: "italic" }}>{result.negotiationScript}</p>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div style={{ backgroundColor: "#1B3A35", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: 0 }}>Want help negotiating?</p>
              <p style={{ fontSize: 12, color: "#00C9A799", margin: 0 }}>Talk to a negotiation expert who&apos;s done it at your target company</p>
            </div>
            <Link href="/experts" style={{ backgroundColor: "#00C9A7", color: "#1B3A35", fontSize: 12, fontWeight: 800, borderRadius: 8, padding: "10px 18px", textDecoration: "none", whiteSpace: "nowrap" }}>
              Find expert →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
