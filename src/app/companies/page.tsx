"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import companiesData from "@/data/companies.json";

/* ─── Types ─────────────────────────────────────── */
interface Company {
  slug: string;
  name: string;
  stage: string;
  industry: string;
  size: string;
  founded: number;
  description: string;
  culture: number;
  wlb: number;
  growth: number;
  compensation: number;
  recommend: number;
  interviewExperiences: number;
  salaryDataPoints: number;
  avgRounds: number;
  offerRate: number;
  interviewDifficulty: string;
}

/* ─── Helpers ───────────────────────────────────── */
const COMPANIES = companiesData as Company[];
const PALETTE = ["#FDE68A","#C4B5FD","#00C9A7","#FFB5C8","#B5D5FF","#FFCBA4","#B5FFD9","#FFD9B5","#FFB5B5","#D5B5FF"];

function companyColor(name: string, i: number) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return PALETTE[(h + i) % PALETTE.length];
}

const STAGES = ["All", "Seed", "Series A", "Series B", "Series C", "Series D", "Series E", "Series F", "Series H", "Growth", "Pre-IPO", "Bootstrapped / PE", "Listed"];
const INDUSTRIES = ["All", "Fintech / Payments", "Fintech / Consumer", "Fintech / Wealth", "E-Commerce", "Quick Commerce", "Food & Logistics Tech", "Developer Tools / SaaS", "Developer Tools / API", "SaaS / Billing"];

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ fontSize: 12, color: "#1a1a1a", fontWeight: 700 }}>
      {rating.toFixed(1)} ★
    </span>
  );
}

/* ─── Page ──────────────────────────────────────── */
export default function CompaniesPage() {
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("All");
  const [industry, setIndustry] = useState("All");

  const filtered = useMemo(() => {
    return COMPANIES.filter((c) => {
      if (stage !== "All" && c.stage !== stage) return false;
      if (industry !== "All" && c.industry !== industry) return false;
      if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.industry.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, stage, industry]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>Know before you join</h1>
        <p style={{ fontSize: 14, color: "#888", margin: 0 }}>Interview intel, salary data, and culture reviews — community-powered.</p>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "18px 20px", marginBottom: 28, display: "flex", flexDirection: "column", gap: 14 }}>
        <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies…" style={{ width: "100%", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All","Series A","Series B","Series C","Growth","Pre-IPO","Listed"].map((s) => (
            <button key={s} onClick={() => setStage(s)} style={{ fontSize: 12, fontWeight: stage === s ? 700 : 500, backgroundColor: stage === s ? "#1B3A35" : "#f0f0f0", color: stage === s ? "#00C9A7" : "#555", border: "none", borderRadius: 99, padding: "6px 14px", cursor: "pointer" }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All","Fintech / Payments","E-Commerce","Quick Commerce","Developer Tools / SaaS","SaaS / Billing","Food & Logistics Tech"].map((i) => (
            <button key={i} onClick={() => setIndustry(i)} style={{ fontSize: 12, fontWeight: industry === i ? 700 : 500, backgroundColor: industry === i ? "#1B3A35" : "#f0f0f0", color: industry === i ? "#00C9A7" : "#555", border: "none", borderRadius: 99, padding: "6px 14px", cursor: "pointer" }}>{i}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {filtered.map((company, i) => {
          const bg = companyColor(company.name, i);
          const avgRating = ((company.culture + company.wlb + company.growth + company.compensation) / 4);
          return (
            <Link key={company.slug} href={`/companies/${company.slug}`} style={{ textDecoration: "none" }}>
              <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 14, cursor: "pointer", transition: "box-shadow 0.15s" }}>
                {/* Top */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#1a1a1a", flexShrink: 0 }}>
                    {company.name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>{company.name}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: "#f0f0f0", color: "#888", borderRadius: 99, padding: "2px 8px" }}>{company.stage}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#888", margin: "2px 0 0" }}>{company.industry}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Stars rating={avgRating} />
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: 16 }}>
                  <span style={{ fontSize: 12, color: "#888" }}>{company.interviewExperiences} interview exp.</span>
                  <span style={{ fontSize: 12, color: "#888" }}>{company.salaryDataPoints} salary pts</span>
                </div>

                {/* Quick stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {[
                    { label: "Avg rounds", value: company.avgRounds },
                    { label: "Offer rate", value: `${company.offerRate}%` },
                    { label: "Interview", value: company.interviewDifficulty },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ backgroundColor: "#fafafa", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a", margin: "0 0 2px" }}>{value}</p>
                      <p style={{ fontSize: 10, color: "#888", margin: 0 }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
