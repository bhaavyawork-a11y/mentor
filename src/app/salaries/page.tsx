"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import salariesData from "@/data/salaries.json";
import GuestBanner from "@/components/GuestBanner";

/* ─── Types ─────────────────────────────────────── */
interface SalaryPoint {
  id: string;
  role: string;
  company: string | null;
  baseSalary: number;
  totalCTC: number;
  variablePct: number;
  stage: string;
  city: string;
  yoe: number;
  gender: string;
}

/* ─── Helpers ───────────────────────────────────── */
const ALL_DATA = salariesData as SalaryPoint[];

function formatINR(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function percentile(arr: number[], p: number) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx] ?? 0;
}

const CITIES = ["All", "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune", "Remote"];
const EXPERIENCES = ["All", "0-2", "2-5", "5-10", "10+"];
const STAGES = ["All", "Seed", "Series A", "Series B", "Series C", "Growth", "Listed", "Pre-IPO"];

function matchExp(yoe: number, filter: string) {
  if (filter === "All") return true;
  if (filter === "0-2") return yoe < 2;
  if (filter === "2-5") return yoe >= 2 && yoe < 5;
  if (filter === "5-10") return yoe >= 5 && yoe < 10;
  if (filter === "10+") return yoe >= 10;
  return true;
}

/* ─── Contribute Modal ──────────────────────────── */
function ContributeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const { session } = useSession();
  const [form, setForm] = useState({ role: "", company: "", baseSalary: "", totalCTC: "", variablePct: "", stage: "Series B", city: "Bangalore", yoe: "", gender: "" });
  const [saving, setSaving] = useState(false);

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.role || !form.baseSalary || !form.totalCTC || !session?.user.id) return;
    setSaving(true);
    await supabase.from("salary_data").insert({
      user_id: session.user.id,
      role: form.role, company: form.company || null,
      base_salary: Number(form.baseSalary), total_ctc: Number(form.totalCTC),
      variable_pct: Number(form.variablePct || 0),
      stage: form.stage, city: form.city,
      yoe: Number(form.yoe || 0),
      gender: form.gender || null,
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ backgroundColor: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>Share your comp to unlock</h2>
            <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>Anonymous. Helps the community.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#839958" }}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1/-1" }}><label className="label">Role *</label><input className="input" value={form.role} onChange={(e) => f("role", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} placeholder="Product Manager" /></div>
          <div style={{ gridColumn: "1/-1" }}><label className="label">Company (optional)</label><input className="input" value={form.company} onChange={(e) => f("company", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} placeholder="Leave blank to stay anonymous" /></div>
          <div><label className="label">Base salary (₹)</label><input type="number" className="input" value={form.baseSalary} onChange={(e) => f("baseSalary", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} placeholder="2500000" /></div>
          <div><label className="label">Total CTC (₹)</label><input type="number" className="input" value={form.totalCTC} onChange={(e) => f("totalCTC", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} placeholder="3800000" /></div>
          <div><label className="label">Variable %</label><input type="number" className="input" value={form.variablePct} onChange={(e) => f("variablePct", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} placeholder="15" /></div>
          <div><label className="label">Years of experience</label><input type="number" className="input" value={form.yoe} onChange={(e) => f("yoe", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} placeholder="4" /></div>
          <div>
            <label className="label">Stage</label>
            <select className="input" value={form.stage} onChange={(e) => f("stage", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              {["Seed","Series A","Series B","Series C","Growth","Pre-IPO","Listed"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">City</label>
            <select className="input" value={form.city} onChange={(e) => f("city", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              {["Bangalore","Mumbai","Delhi","Hyderabad","Pune","Chennai","Remote"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label className="label">Gender (optional)</label>
            <select className="input" value={form.gender} onChange={(e) => f("gender", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              <option value="">Prefer not to say</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="NB">Non-binary</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.role || !form.baseSalary || !form.totalCTC} style={{ opacity: saving || !form.role || !form.baseSalary || !form.totalCTC ? 0.6 : 1 }}>
            {saving ? "Submitting…" : "Submit & unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Range Bar ─────────────────────────────────── */
function RangeBar({ p25, median, p75, max }: { p25: number; median: number; p75: number; max: number }) {
  const pct = (v: number) => Math.round((v / max) * 100);
  return (
    <div style={{ position: "relative", height: 8, backgroundColor: "#e8e4ce", borderRadius: 99, margin: "12px 0" }}>
      <div style={{ position: "absolute", left: `${pct(p25)}%`, right: `${100 - pct(p75)}%`, height: "100%", backgroundColor: "#839958", borderRadius: 99 }} />
      <div style={{ position: "absolute", left: `${pct(median)}%`, transform: "translateX(-50%)", width: 12, height: 12, borderRadius: "50%", backgroundColor: "#0A3323", border: "2px solid #fff", top: -2 }} />
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
export default function SalariesPage() {
  const { session, loading: sessionLoading } = useSession();
  const isGuest = !sessionLoading && !session;

  const [roleSearch, setRoleSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [city, setCity] = useState("All");
  const [exp, setExp] = useState("All");
  const [stage, setStage] = useState("All");
  const [showContribute, setShowContribute] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const filtered = useMemo(() => {
    return ALL_DATA.filter((d) => {
      if (city !== "All" && d.city !== city) return false;
      if (stage !== "All" && d.stage !== stage) return false;
      if (!matchExp(d.yoe, exp)) return false;
      if (roleSearch.trim() && !d.role.toLowerCase().includes(roleSearch.toLowerCase())) return false;
      if (companySearch.trim() && !(d.company ?? "").toLowerCase().includes(companySearch.toLowerCase())) return false;
      return true;
    });
  }, [roleSearch, companySearch, city, exp, stage]);

  const bases = filtered.map((d) => d.baseSalary);
  const ctcs  = filtered.map((d) => d.totalCTC);
  const p25b  = percentile(bases, 25);
  const medB  = percentile(bases, 50);
  const p75b  = percentile(bases, 75);
  const p25c  = percentile(ctcs, 25);
  const medC  = percentile(ctcs, 50);
  const p75c  = percentile(ctcs, 75);
  const maxCTC = Math.max(...ctcs, 1);
  const esopPct = Math.round(filtered.filter((d) => d.variablePct > 0).length / Math.max(filtered.length, 1) * 100);

  const labelFor = `${roleSearch || "All roles"} · ${city === "All" ? "All cities" : city} · ${stage === "All" ? "All stages" : stage}`;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 0" }}>
      <GuestBanner />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>What should you be earning?</h1>
        <p style={{ fontSize: 14, color: "#839958", margin: 0 }}>Real comp data from Indian professionals. Contribute to unlock full access.</p>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 16, padding: "18px 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input className="input" value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} placeholder="Search by role…" style={{ boxSizing: "border-box" }} />
          <input className="input" value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} placeholder="Filter by company…" style={{ boxSizing: "border-box" }} />
        </div>
        {/* City pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CITIES.map((c) => <button key={c} onClick={() => setCity(c)} style={{ fontSize: 12, fontWeight: city === c ? 700 : 500, backgroundColor: city === c ? "#0A3323" : "#e8e4ce", color: city === c ? "#839958" : "#555", border: "none", borderRadius: 99, padding: "6px 14px", cursor: "pointer" }}>{c}</button>)}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Experience</p>
            <div style={{ display: "flex", gap: 6 }}>
              {EXPERIENCES.map((e) => <button key={e} onClick={() => setExp(e)} style={{ fontSize: 12, fontWeight: exp === e ? 700 : 500, backgroundColor: exp === e ? "#0A3323" : "#e8e4ce", color: exp === e ? "#839958" : "#555", border: "none", borderRadius: 99, padding: "6px 14px", cursor: "pointer" }}>{e} yrs</button>)}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Stage</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STAGES.map((s) => <button key={s} onClick={() => setStage(s)} style={{ fontSize: 12, fontWeight: stage === s ? 700 : 500, backgroundColor: stage === s ? "#0A3323" : "#e8e4ce", color: stage === s ? "#839958" : "#555", border: "none", borderRadius: 99, padding: "6px 14px", cursor: "pointer" }}>{s}</button>)}
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 14, color: "#839958" }}>No data matches these filters yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Main range card */}
          <div style={{ backgroundColor: "#0A3323", borderRadius: 16, padding: "28px 28px 24px" }}>
            <p style={{ fontSize: 12, color: "#83995899", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>Total CTC</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 16px" }}>{labelFor}</p>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "#83995899" }}>P25</span>
              <span style={{ fontSize: 12, color: "#83995899" }}>Median</span>
              <span style={{ fontSize: 12, color: "#83995899" }}>P75</span>
            </div>
            <RangeBar p25={p25c} median={medC} p75={p75c} max={maxCTC} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#839958" }}>{formatINR(p25c)}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{formatINR(medC)}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: "#839958" }}>{formatINR(p75c)}</span>
            </div>
            <p style={{ fontSize: 11, color: "#83995855", margin: "12px 0 0" }}>Based on {filtered.length} data point{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Breakdown cards — blurred for guests */}
          <div style={{ position: "relative" }}>
          {isGuest && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 10, borderRadius: 14,
              backdropFilter: "blur(8px)",
              backgroundColor: "rgba(250,247,242,0.8)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>🔒 Sign up to unlock full breakdown</p>
              <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>Contribute your salary data to unlock stage breakdown, base pay, and more.</p>
              <Link href="/auth/login" style={{ fontSize: 13, fontWeight: 800, backgroundColor: "#0A3323", color: "#839958", borderRadius: 10, padding: "10px 24px", textDecoration: "none" }}>
                Sign up + contribute your salary to unlock →
              </Link>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Base salary */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Base salary</p>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {[["P25", p25b], ["Median", medB], ["P75", p75b]].map(([label, val]) => (
                  <div key={label as string} style={{ textAlign: "center" }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>{formatINR(val as number)}</p>
                    <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Variable/ESOP */}
            <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Variable / ESOP</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>{esopPct}%</p>
              <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>include variable / ESOP component</p>
            </div>

            {/* Stage breakdown */}
            {unlocked ? (
              <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 20, gridColumn: "1/-1" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>By company stage</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Series A","Series B","Series C","Growth","Listed"].map((s) => {
                    const pts = filtered.filter((d) => d.stage === s);
                    if (pts.length === 0) return null;
                    const med = percentile(pts.map((d) => d.totalCTC), 50);
                    return (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: "#555", minWidth: 90 }}>{s}</span>
                        <div style={{ flex: 1, height: 6, backgroundColor: "#e8e4ce", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ width: `${Math.round((med / maxCTC) * 100)}%`, height: "100%", backgroundColor: "#839958", borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", minWidth: 50, textAlign: "right" }}>{formatINR(med)}</span>
                        <span style={{ fontSize: 11, color: "#839958", minWidth: 60 }}>{pts.length} resp.</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: "#F9F7EC", border: "1px dashed #ddd", borderRadius: 14, padding: 20, gridColumn: "1/-1", textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>🔒 Full breakdown locked</p>
                <p style={{ fontSize: 12, color: "#839958", margin: "0 0 16px" }}>Share your comp data to unlock stage breakdown, YoY trends, and more.</p>
                <button className="btn-primary" onClick={() => setShowContribute(true)}>Share your comp to unlock</button>
              </div>
            )}
          </div>
          </div>{/* end position:relative blur wrapper */}
        </div>
      )}

      {showContribute && (
        <ContributeModal
          onClose={() => setShowContribute(false)}
          onSaved={() => setUnlocked(true)}
        />
      )}
    </div>
  );
}
