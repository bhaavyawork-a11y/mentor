"use client";

import { useState, useMemo } from "react";

/* ─── Types ─────────────────────────────────────── */
export interface JobRow {
  id: string;
  external_id: string;
  source: string;
  title: string;
  company_name: string;
  company_slug: string;
  company_domain: string | null;
  location: string | null;
  department: string | null;
  job_type: string | null;
  apply_url: string;
  description_snippet: string | null;
  posted_at: string | null;
}

/* ─── Helpers ───────────────────────────────────── */
const COMPANY_COLORS = ["#F7F4D5", "#D3968C", "#5B8AFF", "#FFB5C8", "#B5D5FF", "#FFCBA4", "#B5FFD9", "#FFB5B5"];

function companyColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return COMPANY_COLORS[h % COMPANY_COLORS.length];
}

function postedDaysAgo(postedAt: string | null): number | null {
  if (!postedAt) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(postedAt).getTime()) / 86_400_000));
}

function extractSalary(snippet: string | null): string | null {
  if (!snippet) return null;
  if (!/lpa|lakh|salary|compensation|ctc|₹/i.test(snippet)) return null;
  const m =
    snippet.match(/₹[\d.]+-[\d.]+ ?LPA/i) ||
    snippet.match(/₹[\d.]+ ?LPA/i) ||
    snippet.match(/[\d.]+-[\d.]+ ?LPA/i) ||
    snippet.match(/[\d.]+ ?LPA/i);
  return m ? m[0].trim() : null;
}

function clientMatchScore(job: JobRow, profile: Record<string, unknown> | null): number {
  if (!profile) return 0;
  let score = 0;
  const targetRole = (profile.target_role as string | null | undefined) ?? "";
  const industry   = (profile.industry   as string | null | undefined) ?? "";
  const location   = (profile.location   as string | null | undefined) ?? "";
  const title      = job.title.toLowerCase();
  const dept       = (job.department ?? "").toLowerCase();
  const loc        = (job.location   ?? "").toLowerCase();

  if (targetRole) {
    const words   = targetRole.toLowerCase().split(/\s+/);
    const matches = words.filter((w) => w.length > 2 && title.includes(w));
    score += Math.min(50, matches.length * 20);
  }
  if (industry && dept && (dept.includes(industry.toLowerCase()) || industry.toLowerCase().includes(dept))) {
    score += 30;
  }
  if (location && loc && loc.includes(location.toLowerCase().split(",")[0])) {
    score += 20;
  }
  return Math.min(score, 100);
}

/* ─── Company logo with Clearbit + letter fallback ── */
function CompanyLogo({ domain, name }: { domain: string | null; name: string }) {
  const [fallback, setFallback] = useState(!domain);
  const bg      = companyColor(name);
  const initial = name[0]?.toUpperCase() ?? "?";

  if (!domain || fallback) {
    return (
      <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#F9FAFB", flexShrink: 0 }}>
        {initial}
      </div>
    );
  }
  return (
    <div style={{ width: 40, height: 40, borderRadius: 8, border: "1px solid #1F2937", backgroundColor: "#181C24", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://logo.clearbit.com/${domain}`}
        alt={name}
        width={40}
        height={40}
        onError={() => setFallback(true)}
        style={{ borderRadius: 8, objectFit: "contain", width: 40, height: 40 }}
      />
    </div>
  );
}

/* ─── Job Card ──────────────────────────────────── */
function JobCard({
  job,
  profile,
  initialSaved,
}: {
  job: JobRow;
  profile: Record<string, unknown> | null;
  initialSaved: boolean;
}) {
  const [saved,  setSaved]  = useState(initialSaved);
  const [saving, setSaving] = useState(false);

  const days   = postedDaysAgo(job.posted_at);
  const score  = profile ? clientMatchScore(job, profile) : 0;
  const salary = extractSalary(job.description_snippet);

  const matchColor =
    score >= 80 ? "#5B8AFF" :
    score >= 50 ? "#D3968C" :
    "#aaa";

  const tags = [job.location, job.job_type, job.department].filter(Boolean) as string[];

  const toggleSave = async () => {
    setSaving(true);
    try {
      const res  = await fetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json() as { saved: boolean };
      setSaved(data.saved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <CompanyLogo domain={job.company_domain} name={job.company_name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{job.company_name}</p>
          {days !== null && (
            <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>
              {days === 0 ? "Posted today" : `${days}d ago`}
            </p>
          )}
        </div>
        {profile && score > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: matchColor + "22", color: matchColor, borderRadius: 99, padding: "3px 10px", flexShrink: 0 }}>
            {score}% match
          </span>
        )}
      </div>

      {/* Role */}
      <h3 style={{ fontSize: 17, fontWeight: 800, color: "#F9FAFB", margin: 0, lineHeight: 1.3 }}>{job.title}</h3>

      {/* Tags row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {tags.map((tag) => (
          <span key={tag} style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#0F1117", color: "#6B7280", borderRadius: 99, padding: "4px 10px" }}>
            {tag}
          </span>
        ))}
        {salary && (
          <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#080B1411", color: "#F9FAFB", borderRadius: 99, padding: "4px 10px" }}>
            {salary}
          </span>
        )}
      </div>

      {/* Description (strip salary from end to avoid duplication) */}
      {job.description_snippet && (
        <p style={{ fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {job.description_snippet}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
        <button
          onClick={toggleSave}
          disabled={saving}
          style={{ fontSize: 11, fontWeight: 700, backgroundColor: "transparent", color: saved ? "#080B14" : "#5B8AFF", border: `1px solid ${saved ? "#080B14" : "#ddd"}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}
        >
          {saved ? "✓ Saved" : "♡ Save"}
        </button>
        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#1A3A8F", color: "#F9FAFB", borderRadius: 8, padding: "7px 14px", textDecoration: "none", display: "inline-block" }}
        >
          Apply now →
        </a>
      </div>
    </div>
  );
}

/* ─── Pill row ──────────────────────────────────── */
function PillRow({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{ fontSize: 12, fontWeight: value === opt ? 700 : 500, backgroundColor: value === opt ? "#080B14" : "#e8e4ce", color: value === opt ? "#5B8AFF" : "#555", border: "none", borderRadius: 99, padding: "6px 14px", cursor: "pointer", transition: "all 0.15s" }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ─── Main component ────────────────────────────── */
const JOB_TYPES   = ["All", "Full-time", "Remote", "Contract", "Hybrid"];
const DEPARTMENTS = ["All", "Engineering", "Product", "Growth", "Operations", "Data", "Design", "Finance", "Marketing"];
const SORTS       = ["Latest", "Best match"];

export default function JobsClient({
  jobs,
  savedJobIds,
  targetRole,
  userProfile,
}: {
  jobs: JobRow[];
  savedJobIds: string[];
  targetRole?: string | null;
  userProfile: Record<string, unknown> | null;
}) {
  const [search,  setSearch]  = useState("");
  const [jobType, setJobType] = useState("All");
  const [dept,    setDept]    = useState("All");
  const [company, setCompany] = useState("All");
  const [sort,    setSort]    = useState("Latest");

  const savedSet  = useMemo(() => new Set(savedJobIds), [savedJobIds]);
  const companies = useMemo(() => ["All", ...Array.from(new Set(jobs.map((j) => j.company_name))).sort()], [jobs]);

  const filtered = useMemo(() => {
    let list = jobs.filter((j) => {
      if (company !== "All" && j.company_name !== company) return false;
      if (jobType !== "All") {
        const jt = (j.job_type ?? "").toLowerCase();
        if (jobType === "Remote"    && !jt.includes("remote"))   return false;
        if (jobType === "Hybrid"    && !jt.includes("hybrid"))   return false;
        if (jobType === "Contract"  && !jt.includes("contract")) return false;
        if (jobType === "Full-time" && !jt.includes("full"))     return false;
      }
      if (dept !== "All" && !(j.department ?? "").toLowerCase().includes(dept.toLowerCase())) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (
          !j.title.toLowerCase().includes(s) &&
          !j.company_name.toLowerCase().includes(s) &&
          !(j.location ?? "").toLowerCase().includes(s) &&
          !(j.department ?? "").toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });

    if (sort === "Latest") {
      list = [...list].sort((a, b) => {
        const da = a.posted_at ? new Date(a.posted_at).getTime() : 0;
        const db = b.posted_at ? new Date(b.posted_at).getTime() : 0;
        return db - da;
      });
    } else if (sort === "Best match" && userProfile) {
      list = [...list].sort((a, b) => clientMatchScore(b, userProfile) - clientMatchScore(a, userProfile));
    }

    return list;
  }, [jobs, search, jobType, dept, company, sort, userProfile]);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 0" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#F9FAFB", margin: "0 0 6px" }}>Jobs for you</h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>
          {targetRole ? `Matched for: ${targetRole}` : "Complete your profile to get personalised matches."}
        </p>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 16, padding: "18px 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by role, company, location…" style={{ width: "100%", boxSizing: "border-box" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Job type</p>
          <PillRow options={JOB_TYPES} value={jobType} onChange={setJobType} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Department</p>
          <PillRow options={DEPARTMENTS} value={dept} onChange={setDept} />
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Company</p>
            <select value={company} onChange={(e) => setCompany(e.target.value)} className="input" style={{ width: "100%" }}>
              {companies.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Sort</p>
            <PillRow options={SORTS} value={sort} onChange={setSort} />
          </div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 16px" }}>
        {filtered.length} job{filtered.length !== 1 ? "s" : ""}
        {jobs.length !== filtered.length && ` of ${jobs.length}`}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>
              {jobs.length === 0 ? "Jobs are syncing… Check back in a few minutes." : "No jobs match your filters."}
            </p>
            {jobs.length === 0 && (
              <a href="/companies" style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB", textDecoration: "none" }}>Browse companies →</a>
            )}
          </div>
        ) : (
          filtered.map((job) => (
            <JobCard key={job.id} job={job} profile={userProfile} initialSaved={savedSet.has(job.id)} />
          ))
        )}
      </div>
    </div>
  );
}
