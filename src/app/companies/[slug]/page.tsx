"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import companiesData from "@/data/companies.json";
import salariesData from "@/data/salaries.json";
import jobsData from "@/data/jobs.json";

/* ─── Types ─────────────────────────────────────── */
interface Company {
  slug: string; name: string; stage: string; industry: string;
  size: string; founded: number; description: string;
  culture: number; wlb: number; growth: number; compensation: number;
  recommend: number; interviewExperiences: number; salaryDataPoints: number;
  avgRounds: number; offerRate: number; interviewDifficulty: string;
  interviewDuration: string; website: string;
}
interface Review { id: string; overall_rating: number; culture_rating: number; wlb_rating: number; growth_rating: number; comp_rating: number; pros: string | null; cons: string | null; title: string | null; tenure: string | null; recommend: boolean; created_at: string; }
interface InterviewExp { id: string; role: string; rounds: number | null; duration: string | null; difficulty: string | null; outcome: string | null; content: string | null; created_at: string; }
interface SalaryPoint { role: string; company: string | null; baseSalary: number; totalCTC: number; variablePct: number; stage: string; city: string; yoe: number; }
interface Job { id: string; title: string; company: string; location: string; type: string; experience: string; salaryMin: number; salaryMax: number; description: string; }

/* ─── Helpers ───────────────────────────────────── */
const ALL_COMPANIES = companiesData as Company[];
const ALL_SALARIES = salariesData as SalaryPoint[];
const ALL_JOBS = jobsData as Job[];

function formatINR(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return <span style={{ fontSize: size, fontWeight: 700, color: "#F9FAFB" }}>{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>;
}

const OUTCOME_STYLE: Record<string, { bg: string; color: string }> = {
  "Got offer":  { bg: "#5B8AFF22", color: "#F9FAFB" },
  "Rejected":   { bg: "#ff6b6b22", color: "#cc0000" },
  "Withdrew":   { bg: "#e8e4ce",   color: "#6B7280" },
  "No decision":{ bg: "#F7F4D522", color: "#8a7200" },
};

/* ─── Review Modal ──────────────────────────────── */
function ReviewModal({ slug, onClose, onSaved }: { slug: string; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const { session } = useSession();
  const [form, setForm] = useState({ overall: 4, culture: 4, wlb: 4, growth: 4, comp: 4, pros: "", cons: "", title: "", tenure: "", recommend: true });
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form, v: string | number | boolean) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!session?.user.id) return;
    setSaving(true);
    await supabase.from("company_reviews").insert({ user_id: session.user.id, company_slug: slug, overall_rating: form.overall, culture_rating: form.culture, wlb_rating: form.wlb, growth_rating: form.growth, comp_rating: form.comp, pros: form.pros || null, cons: form.cons || null, title: form.title || null, tenure: form.tenure || null, recommend: form.recommend });
    setSaving(false); onSaved(); onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ backgroundColor: "#181C24", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 16, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#F9FAFB", margin: 0 }}>Write a review</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6B7280" }}>✕</button>
        </div>
        {([["overall","Overall",form.overall],["culture","Culture",form.culture],["wlb","Work-life balance",form.wlb],["growth","Growth",form.growth],["comp","Compensation",form.comp]] as [keyof typeof form, string, number][]).map(([k, label, val]) => (
          <div key={k}>
            <label className="label">{label}</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[1,2,3,4,5].map((n) => (
                <button key={n} onClick={() => f(k, n)} style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: val >= n ? "#F7F4D5" : "#e8e4ce", border: "none", cursor: "pointer", fontSize: 16 }}>{"★"}</button>
              ))}
            </div>
          </div>
        ))}
        <div><label className="label">Pros</label><textarea className="input" rows={2} value={form.pros} onChange={(e) => f("pros", e.target.value)} style={{ width: "100%", boxSizing: "border-box", resize: "none" }} placeholder="What's great about working here?" /></div>
        <div><label className="label">Cons</label><textarea className="input" rows={2} value={form.cons} onChange={(e) => f("cons", e.target.value)} style={{ width: "100%", boxSizing: "border-box", resize: "none" }} placeholder="What could be better?" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label className="label">Your title</label><input className="input" value={form.title} onChange={(e) => f("title", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} placeholder="e.g. Senior PM" /></div>
          <div><label className="label">Tenure</label><input className="input" value={form.tenure} onChange={(e) => f("tenure", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} placeholder="e.g. 2 years" /></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" id="rec" checked={form.recommend} onChange={(e) => f("recommend", e.target.checked)} />
          <label htmlFor="rec" style={{ fontSize: 13, color: "#9CA3AF", cursor: "pointer" }}>Would recommend to a friend</label>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? "Saving…" : "Submit review"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Interview Experience Modal ────────────────── */
function InterviewModal({ slug, onClose, onSaved }: { slug: string; onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const { session } = useSession();
  const [form, setForm] = useState({ role: "", rounds: "", duration: "", difficulty: "Medium", outcome: "Got offer", content: "" });
  const [saving, setSaving] = useState(false);
  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!session?.user.id || !form.role) return;
    setSaving(true);
    await supabase.from("interview_experiences").insert({ user_id: session.user.id, company_slug: slug, role: form.role, rounds: form.rounds ? Number(form.rounds) : null, duration: form.duration || null, difficulty: form.difficulty, outcome: form.outcome, content: form.content || null });
    setSaving(false); onSaved(); onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ backgroundColor: "#181C24", borderRadius: 20, padding: 28, width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#F9FAFB", margin: 0 }}>Add your experience</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#6B7280" }}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1/-1" }}><label className="label">Role applied for *</label><input className="input" value={form.role} onChange={(e) => f("role", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} placeholder="Product Manager" /></div>
          <div><label className="label">No. of rounds</label><input type="number" className="input" value={form.rounds} onChange={(e) => f("rounds", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} /></div>
          <div><label className="label">Duration</label><input className="input" value={form.duration} onChange={(e) => f("duration", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} placeholder="2–3 weeks" /></div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={form.difficulty} onChange={(e) => f("difficulty", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              {["Easy","Medium","Hard"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Outcome</label>
            <select className="input" value={form.outcome} onChange={(e) => f("outcome", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              {["Got offer","Rejected","Withdrew","No decision"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1/-1" }}><label className="label">Your experience</label><textarea className="input" rows={4} value={form.content} onChange={(e) => f("content", e.target.value)} style={{ width: "100%", boxSizing: "border-box", resize: "none" }} placeholder="Describe the interview process, questions asked, culture feel…" /></div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.role} style={{ opacity: saving || !form.role ? 0.6 : 1 }}>{saving ? "Saving…" : "Submit"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
type Tab = "overview" | "interviews" | "salaries" | "reviews" | "jobs";

export default function CompanyPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const supabase = createClient();
  const company = ALL_COMPANIES.find((c) => c.slug === slug);
  const [tab, setTab] = useState<Tab>("overview");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [experiences, setExperiences] = useState<InterviewExp[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [showInterview, setShowInterview] = useState(false);

  const companySalaries = ALL_SALARIES.filter((s) => (s.company ?? "").toLowerCase() === (company?.name ?? "").toLowerCase());
  const companyJobs = ALL_JOBS.filter((j) => j.company.toLowerCase() === (company?.name ?? "").toLowerCase());

  const loadData = useCallback(async () => {
    const [revRes, expRes] = await Promise.all([
      supabase.from("company_reviews").select("*").eq("company_slug", slug).order("created_at", { ascending: false }),
      supabase.from("interview_experiences").select("*").eq("company_slug", slug).order("created_at", { ascending: false }),
    ]);
    setReviews((revRes.data as Review[]) ?? []);
    setExperiences((expRes.data as InterviewExp[]) ?? []);
  }, [slug, supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  if (!company) return <div style={{ padding: 32 }}><p style={{ color: "#6B7280" }}>Company not found.</p></div>;

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview",   label: "Overview" },
    { id: "interviews", label: `Interview Process (${experiences.length})` },
    { id: "salaries",   label: `Salaries (${companySalaries.length})` },
    { id: "reviews",    label: `Reviews (${reviews.length})` },
    { id: "jobs",       label: `Open Roles (${companyJobs.length})` },
  ];

  const avgRating = ((company.culture + company.wlb + company.growth + company.compensation) / 4);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
        <div style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: "rgba(26,58,143,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#F9FAFB", flexShrink: 0 }}>
          {company.name[0]}
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F9FAFB", margin: 0 }}>{company.name}</h1>
            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#1F2937", color: "#6B7280", borderRadius: 99, padding: "3px 10px" }}>{company.stage}</span>
          </div>
          <p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0" }}>{company.industry} · {company.size} employees · Founded {company.founded}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Stars rating={avgRating} />
            <span style={{ fontSize: 12, color: "#6B7280" }}>{avgRating.toFixed(1)} · {company.recommend}% recommend</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, backgroundColor: "#f5f5f5", padding: 4, borderRadius: 12, marginBottom: 28, overflowX: "auto" }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{ fontSize: 12, fontWeight: tab === id ? 700 : 500, color: tab === id ? "#1a1a1a" : "#5B8AFF", backgroundColor: tab === id ? "#fff" : "transparent", border: "none", borderRadius: 10, padding: "8px 16px", cursor: "pointer", boxShadow: tab === id ? "0 1px 4px rgba(0,0,0,0.08)" : "none", whiteSpace: "nowrap" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 14, padding: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>About</p>
            <p style={{ fontSize: 14, color: "#F9FAFB", lineHeight: 1.7, margin: 0 }}>{company.description}</p>
            {company.website && <a href={company.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#6B7280", marginTop: 10, display: "inline-block" }}>Visit website →</a>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[["Culture", company.culture],["Work-life", company.wlb],["Growth", company.growth],["Compensation", company.compensation]].map(([label, val]) => (
              <div key={label as string} style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 12, padding: 16, textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: "#F9FAFB", margin: "0 0 4px" }}>{(val as number).toFixed(1)}</p>
                <Stars rating={val as number} size={11} />
                <p style={{ fontSize: 11, color: "#6B7280", margin: "4px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>
          <div style={{ backgroundColor: "#1A3A8F", borderRadius: 14, padding: "18px 20px" }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#6B7280", margin: "0 0 4px" }}>{company.recommend}%</p>
            <p style={{ fontSize: 13, color: "#ffffff88", margin: 0 }}>of reviewers would recommend to a friend</p>
          </div>
        </div>
      )}

      {/* Interview Process */}
      {tab === "interviews" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Static summary */}
          <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 14, padding: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 14px" }}>Typical process</p>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {[["Avg rounds", `${company.avgRounds} rounds`],["Duration", company.interviewDuration],["Difficulty", company.interviewDifficulty],["Offer rate", `${company.offerRate}%`]].map(([label, val]) => (
                <div key={label as string}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#F9FAFB", margin: "0 0 2px" }}>{val}</p>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={() => setShowInterview(true)} style={{ alignSelf: "flex-start" }}>+ Add your experience</button>

          {experiences.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: 14, color: "#6B7280" }}>No experiences yet. Be the first to share.</p>
            </div>
          ) : (
            experiences.map((exp) => (
              <div key={exp.id} style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 12, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB", margin: 0 }}>{exp.role}</p>
                    <p style={{ fontSize: 12, color: "#6B7280", margin: "2px 0 0" }}>Anonymous · {new Date(exp.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
                  </div>
                  {exp.outcome && (
                    <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: (OUTCOME_STYLE[exp.outcome] ?? OUTCOME_STYLE["No decision"]).bg, color: (OUTCOME_STYLE[exp.outcome] ?? OUTCOME_STYLE["No decision"]).color, borderRadius: 99, padding: "3px 10px" }}>{exp.outcome}</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                  {exp.rounds && <span style={{ fontSize: 12, color: "#9CA3AF" }}>{exp.rounds} rounds</span>}
                  {exp.duration && <span style={{ fontSize: 12, color: "#9CA3AF" }}>{exp.duration}</span>}
                  {exp.difficulty && <span style={{ fontSize: 12, color: "#9CA3AF" }}>{exp.difficulty}</span>}
                </div>
                {exp.content && <p style={{ fontSize: 13, color: "#F9FAFB", lineHeight: 1.6, margin: 0 }}>{exp.content}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Salaries */}
      {tab === "salaries" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/salaries" style={{ fontSize: 13, color: "#6B7280", textDecoration: "none" }}>← See all salary data</Link>
          {companySalaries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: 14, color: "#6B7280" }}>No salary data for {company.name} yet. <Link href="/salaries" style={{ color: "#6B7280" }}>Contribute yours →</Link></p>
            </div>
          ) : (
            companySalaries.map((s, i) => (
              <div key={i} style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB", margin: "0 0 4px" }}>{s.role}</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 11, backgroundColor: "#1F2937", color: "#6B7280", borderRadius: 99, padding: "2px 8px" }}>{s.city}</span>
                      <span style={{ fontSize: 11, backgroundColor: "#1F2937", color: "#6B7280", borderRadius: 99, padding: "2px 8px" }}>{s.yoe} yrs exp</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "#F9FAFB", margin: "0 0 2px" }}>{formatINR(s.totalCTC)} CTC</p>
                    <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>{formatINR(s.baseSalary)} base</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reviews */}
      {tab === "reviews" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button className="btn-primary" onClick={() => setShowReview(true)} style={{ alignSelf: "flex-start" }}>Write a review</button>
          {reviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: 14, color: "#6B7280" }}>No reviews yet. Be the first.</p>
            </div>
          ) : (
            reviews.map((r) => (
              <div key={r.id} style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 12, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <Stars rating={r.overall_rating} />
                    {(r.title || r.tenure) && <p style={{ fontSize: 12, color: "#6B7280", margin: "4px 0 0" }}>{[r.title, r.tenure].filter(Boolean).join(" · ")}</p>}
                  </div>
                  {r.recommend && <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#5B8AFF22", color: "#F9FAFB", borderRadius: 99, padding: "3px 10px" }}>Recommends ✓</span>}
                </div>
                {r.pros && <p style={{ fontSize: 13, color: "#F9FAFB", margin: "0 0 8px" }}><strong>Pros:</strong> {r.pros}</p>}
                {r.cons && <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0 }}><strong>Cons:</strong> {r.cons}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* Open Roles */}
      {tab === "jobs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {companyJobs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: 14, color: "#6B7280" }}>No open roles from {company.name} in our database yet. <Link href="/jobs" style={{ color: "#6B7280" }}>Browse all jobs →</Link></p>
            </div>
          ) : (
            companyJobs.map((job) => (
              <div key={job.id} style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 12, padding: 18 }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#F9FAFB", margin: "0 0 6px" }}>{job.title}</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  {[job.location, job.type, job.experience].map((t) => (
                    <span key={t} style={{ fontSize: 11, backgroundColor: "#0F1117", color: "#6B7280", borderRadius: 99, padding: "3px 10px" }}>{t}</span>
                  ))}
                </div>
                <p style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.5, margin: "0 0 12px" }}>{job.description}</p>
                <Link href="/jobs" style={{ fontSize: 12, fontWeight: 700, backgroundColor: "#1A3A8F", color: "#6B7280", borderRadius: 8, padding: "8px 16px", textDecoration: "none" }}>Apply now →</Link>
              </div>
            ))
          )}
        </div>
      )}

      {showReview && <ReviewModal slug={slug} onClose={() => setShowReview(false)} onSaved={loadData} />}
      {showInterview && <InterviewModal slug={slug} onClose={() => setShowInterview(false)} onSaved={loadData} />}
    </div>
  );
}
