"use client";

import { useState, useMemo } from "react";
import { useProfile } from "@/hooks/useProfile";
import jobsData from "@/data/jobs.json";

/* ─── Types ─────────────────────────────────────── */
interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  experience: string;
  salaryMin: number;
  salaryMax: number;
  description: string;
  tags: string[];
  postedDaysAgo: number;
  applyUrl: string;
}

interface MatchResult {
  matchScore: number;
  reasons: string[];
  skillGaps: string[];
}

const JOBS = jobsData as Job[];

/* ─── Helpers ───────────────────────────────────── */
const COMPANY_COLORS = ["#FDE68A", "#C4B5FD", "#00C9A7", "#FFB5C8", "#B5D5FF", "#FFCBA4", "#B5FFD9", "#FFB5B5"];

function companyColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return COMPANY_COLORS[h % COMPANY_COLORS.length];
}

function formatSalary(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

/* ─── Job Card ──────────────────────────────────── */
function JobCard({ job, profile }: { job: Job; profile: Record<string, unknown> | null }) {
  const [matchOpen, setMatchOpen] = useState(false);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const avatarBg = companyColor(job.company);
  const initial = job.company[0]?.toUpperCase() ?? "?";

  const loadMatch = async () => {
    if (match) { setMatchOpen((o) => !o); return; }
    setMatchOpen(true);
    setMatchLoading(true);
    try {
      const res = await fetch("/api/ai/job-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job, profile }),
      });
      const data = await res.json() as MatchResult;
      setMatch(data);
    } finally {
      setMatchLoading(false);
    }
  };

  const matchColor = match
    ? match.matchScore >= 80 ? "#00C9A7" : match.matchScore >= 60 ? "#FDE68A" : "#C4B5FD"
    : "#FDE68A";

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Top */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#1a1a1a", flexShrink: 0 }}>
          {initial}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{job.company}</p>
          <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{job.location}</p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: "#00C9A722", color: "#1B3A35", borderRadius: 99, padding: "3px 10px", flexShrink: 0 }}>
          Active {job.postedDaysAgo}d ago
        </span>
      </div>

      {/* Role */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: "#1a1a1a", margin: 0, lineHeight: 1.3 }}>{job.title}</h3>
        <span style={{ fontSize: 12, fontWeight: 800, backgroundColor: matchColor + "33", color: matchColor === "#FDE68A" ? "#8a7200" : matchColor, borderRadius: 99, padding: "4px 12px", flexShrink: 0, whiteSpace: "nowrap" }}>
          {match ? `${match.matchScore}% match` : "Match?"}
        </span>
      </div>

      {/* Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {[job.location, job.type, `${formatSalary(job.salaryMin)} – ${formatSalary(job.salaryMax)}`, job.experience].map((tag) => (
          <span key={tag} style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#FAF7F2", color: "#888", borderRadius: 99, padding: "4px 12px" }}>{tag}</span>
        ))}
      </div>

      {/* Description */}
      <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {job.description}
      </p>

      {/* Skill tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {job.tags.map((t) => (
          <span key={t} style={{ fontSize: 11, backgroundColor: "#f0f0f0", color: "#555", borderRadius: 6, padding: "3px 8px" }}>{t}</span>
        ))}
      </div>

      {/* Match expansion */}
      {matchOpen && (
        <div style={{ backgroundColor: "#f8fffe", border: "1px solid #00C9A733", borderRadius: 12, padding: 14 }}>
          {matchLoading ? (
            <p style={{ fontSize: 13, color: "#888", margin: 0 }}>Analysing your profile…</p>
          ) : match ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 6, backgroundColor: "#eee", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${match.matchScore}%`, height: "100%", backgroundColor: matchColor, borderRadius: 99 }} />
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: matchColor }}>{match.matchScore}%</span>
              </div>
              {match.reasons.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#00C9A7", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>Why you match</p>
                  {match.reasons.map((r, i) => <p key={i} style={{ fontSize: 12, color: "#333", margin: "0 0 4px", display: "flex", gap: 6 }}><span style={{ color: "#00C9A7" }}>✓</span>{r}</p>)}
                </div>
              )}
              {match.skillGaps.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>Gaps to bridge</p>
                  {match.skillGaps.map((g, i) => <p key={i} style={{ fontSize: 12, color: "#555", margin: "0 0 4px", display: "flex", gap: 6 }}><span style={{ color: "#ff6b6b" }}>→</span>{g}</p>)}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setSaved((s) => !s)}
          style={{ fontSize: 11, fontWeight: 700, backgroundColor: "transparent", color: saved ? "#1B3A35" : "#888", border: `1px solid ${saved ? "#1B3A35" : "#ddd"}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}
        >
          {saved ? "✓ Saved" : "Save job"}
        </button>
        <a
          href={job.applyUrl}
          style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#1B3A35", color: "#00C9A7", borderRadius: 8, padding: "7px 14px", textDecoration: "none", display: "inline-block" }}
        >
          Apply now →
        </a>
        <button
          onClick={loadMatch}
          style={{ fontSize: 11, fontWeight: 700, backgroundColor: "transparent", color: "#888", border: "1px solid #eee", borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}
        >
          {matchOpen ? "Hide match ↑" : "Why this matches you →"}
        </button>
      </div>
    </div>
  );
}

/* ─── Pill row ──────────────────────────────────── */
function PillRow({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((opt) => (
        <button key={opt} onClick={() => onChange(opt)} style={{ fontSize: 12, fontWeight: value === opt ? 700 : 500, backgroundColor: value === opt ? "#1B3A35" : "#f0f0f0", color: value === opt ? "#00C9A7" : "#555", border: "none", borderRadius: 99, padding: "6px 14px", cursor: "pointer", transition: "all 0.15s" }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
const JOB_TYPES = ["All", "Full-time", "Contract", "Remote", "Hybrid"];
const EXPERIENCES = ["All", "Fresher", "1-3 yrs", "3-5 yrs", "5+ yrs"];
const SORTS = ["Relevance", "Latest", "Salary high-low"];

export default function JobsPage() {
  const { profile } = useProfile();
  const [search, setSearch] = useState("");
  const [jobType, setJobType] = useState("All");
  const [experience, setExperience] = useState("All");
  const [sort, setSort] = useState("Relevance");

  const filtered = useMemo(() => {
    let list = JOBS.filter((j) => {
      if (jobType !== "All" && j.type !== jobType) return false;
      if (experience !== "All" && j.experience !== experience) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!j.title.toLowerCase().includes(s) && !j.company.toLowerCase().includes(s) && !j.location.toLowerCase().includes(s) && !j.tags.join(" ").toLowerCase().includes(s)) return false;
      }
      return true;
    });
    if (sort === "Latest") list = [...list].sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
    if (sort === "Salary high-low") list = [...list].sort((a, b) => b.salaryMax - a.salaryMax);
    return list;
  }, [search, jobType, experience, sort]);

  const targetRole = (profile as { target_role?: string | null } | null)?.target_role;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>Jobs matched for you</h1>
        <p style={{ fontSize: 14, color: "#888", margin: 0 }}>
          {targetRole ? `Based on your target role: ${targetRole}` : "Complete your profile to get personalised matches."}
        </p>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "18px 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by role, company, location…" style={{ width: "100%", boxSizing: "border-box" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Job type</p>
          <PillRow options={JOB_TYPES} value={jobType} onChange={setJobType} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Experience</p>
          <PillRow options={EXPERIENCES} value={experience} onChange={setExperience} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0, whiteSpace: "nowrap" }}>Sort:</p>
          <PillRow options={SORTS} value={sort} onChange={setSort} />
        </div>
      </div>

      {/* Count */}
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>{filtered.length} job{filtered.length !== 1 ? "s" : ""}</p>

      {/* Job list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 14, color: "#888" }}>No jobs match your filters.</p>
          </div>
        ) : (
          filtered.map((job) => (
            <JobCard key={job.id} job={job} profile={profile as Record<string, unknown> | null} />
          ))
        )}
      </div>
    </div>
  );
}
