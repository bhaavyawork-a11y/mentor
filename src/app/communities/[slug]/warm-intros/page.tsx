"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";

const DARK   = "#0A0A0A";   // header bg — matches discussions
const NAVY   = "#1A3A8F";
const NAVYXL = "#EEF2FF";
const WHITE  = "#FFFFFF";
const BG     = "#FAFAFA";
const LIGHT  = "#EBEBEB";
const INK    = "#0A0A0A";
const MID    = "#888";

const TABS = ["Discussions", "Library", "Warm Intros", "Open Roles"];

const AVATAR_COLORS = ["#1A3A8F","#16A34A","#DC2626","#D97706","#7C3AED","#0891B2","#0E7490"];

interface IntroCard {
  id: number; name: string; title: string; company: string;
  description: string; tags: string[]; mode: "offering" | "seeking";
}

const INTROS: IntroCard[] = [
  { id: 1, name: "Kavya Sharma",  title: "Sr. Product Manager", company: "Razorpay",   description: "Happy to intro to PMs at Series A–C fintechs. Connections across Stripe, Zepto & CRED.",      tags: ["Fintech", "Series A–C", "Product"],     mode: "offering" },
  { id: 2, name: "Arjun Kapoor",  title: "Growth Lead",         company: "Meesho",     description: "Can intro to growth & marketing roles at D2C brands and quick-commerce startups.",             tags: ["Growth", "D2C", "Quick-commerce"],       mode: "offering" },
  { id: 3, name: "Riya Mehta",    title: "VC Associate",        company: "Lightspeed", description: "Looking for warm intros to founders building in B2B SaaS or climate tech.",                   tags: ["B2B SaaS", "Climate Tech", "Founders"],  mode: "seeking"  },
  { id: 4, name: "Dev Patel",     title: "Engineering Manager", company: "Swiggy",     description: "Can connect backend/ML engineers to infra & platform roles at late-stage startups.",           tags: ["Engineering", "ML/AI", "Infra"],         mode: "offering" },
  { id: 5, name: "Sneha Iyer",    title: "Chief of Staff",      company: "Peak XV",    description: "Seeking intros to operators who've scaled 0→1 teams. Esp. founders-office roles.",            tags: ["Founders-office", "Operations", "0→1"],  mode: "seeking"  },
  { id: 6, name: "Rohit Nair",    title: "Data Scientist",      company: "Flipkart",   description: "Can connect data & analytics folks to ML platform and data engineering roles at e-commerce.",  tags: ["Data", "Analytics", "E-commerce"],       mode: "offering" },
];

export default function WarmIntrosPage() {
  const params = useParams();
  const router = useRouter();
  const slug   = params?.slug as string;
  const groupName = slug?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) ?? "Group";

  const [toggle, setToggle] = useState<"offering" | "seeking">("offering");
  const filtered = INTROS.filter(c => c.mode === toggle);

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column", fontFamily: "var(--font-sora),Inter,sans-serif", paddingBottom: 64 }}>

      {/* ── Dark header — matches discussions exactly ── */}
      <div style={{ backgroundColor: DARK, flexShrink: 0, position: "sticky", top: 0, zIndex: 100 }}>

        {/* Row 1: back | name | (no badge here, no online count on warm intros) */}
        <div style={{ display: "flex", alignItems: "flex-start", padding: "16px 16px 0", gap: 10 }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1, marginTop: 4, flexShrink: 0 }}
            aria-label="Back"
          >
            ←
          </button>
          <span style={{ fontSize: 26, fontWeight: 900, color: WHITE, letterSpacing: "-0.7px", lineHeight: 1.15, flex: 1 }}>
            {groupName}
          </span>
        </div>

        {/* Row 2: tabs */}
        <div style={{ display: "flex", overflowX: "auto", padding: "10px 8px 0", scrollbarWidth: "none" as const }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => {
                if (tab === "Discussions") router.push(`/communities/${slug}/discussions`);
                else if (tab === "Library" || tab === "Open Roles") router.push(`/communities/${slug}/discussions`);
              }}
              style={{
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: tab === "Warm Intros" ? 800 : 500,
                padding: "0 14px 10px", whiteSpace: "nowrap" as const,
                color: tab === "Warm Intros" ? WHITE : "rgba(255,255,255,0.4)",
                borderBottom: tab === "Warm Intros" ? `2.5px solid ${WHITE}` : "2.5px solid transparent",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toggle ── */}
      <div style={{ padding: "14px 16px 8px", backgroundColor: WHITE, borderBottom: `1px solid ${LIGHT}` }}>
        <div style={{ display: "flex", background: NAVYXL, borderRadius: 10, padding: 3, gap: 3 }}>
          {(["offering", "seeking"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setToggle(mode)}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 800,
                background: toggle === mode ? NAVY : "transparent",
                color: toggle === mode ? WHITE : NAVY,
                transition: "all 0.15s",
              }}
            >
              {mode === "offering" ? "Offering intros" : "Seeking intros"}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: MID, fontWeight: 600, margin: "9px 0 0" }}>
          {filtered.length} member{filtered.length !== 1 ? "s" : ""} {toggle === "offering" ? "offering" : "seeking"} intros
        </p>
      </div>

      {/* ── Cards ── */}
      <div style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(card => {
          const initial = card.name[0].toUpperCase();
          const avatarColor = AVATAR_COLORS[card.id % AVATAR_COLORS.length];
          return (
            <div key={card.id} style={{ background: WHITE, borderRadius: 16, padding: "14px 14px 12px", border: `1.5px solid ${LIGHT}` }}>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: WHITE }}>
                  {initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginBottom: 2 }}>{card.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: MID, fontWeight: 500 }}>{card.title}</span>
                    <span style={{ fontSize: 9, color: NAVY, background: NAVYXL, padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>{card.company}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: 12, color: "#555", lineHeight: 1.55, margin: "0 0 10px" }}>{card.description}</p>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 12 }}>
                {card.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 700, color: NAVY, background: NAVYXL, padding: "3px 8px", borderRadius: 5 }}>{tag}</span>
                ))}
              </div>

              {/* CTA */}
              <button style={{ width: "100%", padding: "11px 0", background: NAVY, color: WHITE, border: "none", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                {toggle === "offering" ? "Request intro →" : "Connect →"}
              </button>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
