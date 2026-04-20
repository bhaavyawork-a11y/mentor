"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";

const INK = "#0A0A0A"; const NAVY = "#1A3A8F"; const NAVYL = "#5B8AFF";
const NAVYXL = "#EEF2FF"; const WHITE = "#FFFFFF"; const LIGHT = "#EBEBEB";
const MID = "#888";

const TABS = ["Discussions", "Library", "Warm Intros", "Open Roles"];

const AVATAR_COLORS = ["#1A3A8F","#16A34A","#DC2626","#D97706","#7C3AED","#0891B2","#0E7490"];

interface IntroCard {
  id: number; name: string; title: string; company: string;
  description: string; tags: string[]; mode: "offering" | "seeking";
}

const INTROS: IntroCard[] = [
  {
    id: 1, name: "Kavya Sharma", title: "Sr. Product Manager", company: "Razorpay",
    description: "Happy to intro to PMs at Series A–C fintechs. Have connections across Stripe, Zepto & CRED.",
    tags: ["Fintech", "Series A–C", "Product"],
    mode: "offering",
  },
  {
    id: 2, name: "Arjun Kapoor", title: "Growth Lead", company: "Meesho",
    description: "Can intro to growth & marketing roles at D2C brands and quick-commerce startups.",
    tags: ["Growth", "D2C", "Quick-commerce"],
    mode: "offering",
  },
  {
    id: 3, name: "Riya Mehta", title: "VC Associate", company: "Lightspeed",
    description: "Looking for warm intros to founders building in B2B SaaS or climate tech space.",
    tags: ["B2B SaaS", "Climate Tech", "Founder"],
    mode: "seeking",
  },
  {
    id: 4, name: "Dev Patel", title: "Engineering Manager", company: "Swiggy",
    description: "Can connect engineers (backend, ML) looking for infra/platform roles at late-stage startups.",
    tags: ["Engineering", "ML/AI", "Infra"],
    mode: "offering",
  },
  {
    id: 5, name: "Sneha Iyer", title: "Chief of Staff", company: "Peak XV",
    description: "Seeking intros to operators who've scaled 0→1 teams. Esp interested in founders-office roles.",
    tags: ["Founders-office", "Operations", "0→1"],
    mode: "seeking",
  },
  {
    id: 6, name: "Rohit Nair", title: "Data Scientist", company: "Flipkart",
    description: "Can intro data & analytics professionals to ML platform and data eng roles at e-commerce cos.",
    tags: ["Data", "Analytics", "E-commerce"],
    mode: "offering",
  },
];

export default function WarmIntrosPage() {
  const params = useParams();
  const router = useRouter();
  const slug   = params?.slug as string;
  const groupName = slug?.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()) ?? "Group";

  const [toggle, setToggle] = useState<"offering" | "seeking">("offering");

  const filtered = INTROS.filter(c => c.mode === toggle);

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: NAVYXL, display: "flex", flexDirection: "column", fontFamily: "var(--font-sora),Inter,sans-serif", paddingBottom: 64 }}>

      {/* ── Dark header ── */}
      <div style={{ backgroundColor: INK, flexShrink: 0, position: "sticky", top: 0, zIndex: 100 }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => router.back()}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer", padding: "0 4px 0 0", lineHeight: 1 }}
              aria-label="Back"
            >
              ←
            </button>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#FAFAFA", letterSpacing: "-0.3px" }}>{groupName}</span>
          </div>
        </div>

        {/* Channel tabs */}
        <div style={{ display: "flex", overflowX: "auto", padding: "0 8px", scrollbarWidth: "none" as const }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => {
                if (tab === "Discussions") router.push(`/communities/${slug}/discussions`);
                else if (tab === "Library")    router.push(`/communities/${slug}/discussions`);
                else if (tab === "Open Roles") router.push(`/communities/${slug}/discussions`);
              }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700, padding: "8px 14px", whiteSpace: "nowrap" as const,
                color: tab === "Warm Intros" ? "#FAFAFA" : "rgba(255,255,255,0.38)",
                borderBottom: tab === "Warm Intros" ? "2px solid #FAFAFA" : "2px solid transparent",
                fontFamily: "inherit",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Offering / Seeking toggle ── */}
      <div style={{ padding: "14px 16px 0" }}>
        <div style={{ display: "flex", background: WHITE, borderRadius: 10, padding: 3, gap: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          {(["offering", "seeking"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setToggle(mode)}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 800, letterSpacing: "0.2px",
                background: toggle === mode ? NAVY : "transparent",
                color: toggle === mode ? WHITE : NAVY,
                transition: "all 0.15s",
              }}
            >
              {mode === "offering" ? "Offering intros" : "Seeking intros"}
            </button>
          ))}
        </div>

        {/* Count label */}
        <p style={{ fontSize: 11, color: MID, fontWeight: 600, margin: "10px 0 4px", letterSpacing: "0.2px" }}>
          {filtered.length} member{filtered.length !== 1 ? "s" : ""} {toggle === "offering" ? "offering" : "seeking"} intros
        </p>
      </div>

      {/* ── Intro cards ── */}
      <div style={{ flex: 1, padding: "6px 16px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((card, i) => {
          const initial = card.name[0].toUpperCase();
          const avatarColor = AVATAR_COLORS[card.id % AVATAR_COLORS.length];
          return (
            <div
              key={card.id}
              style={{
                background: WHITE, borderRadius: 16, padding: "14px 14px 12px",
                boxShadow: "0 1px 6px rgba(26,58,143,0.07)", border: `1px solid ${LIGHT}`,
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                  background: avatarColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 700, color: WHITE,
                }}>
                  {initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginBottom: 2 }}>{card.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: MID, fontWeight: 500 }}>{card.title}</span>
                    <span style={{ fontSize: 9, color: NAVYL, background: NAVYXL, padding: "1px 7px", borderRadius: 4, fontWeight: 700 }}>
                      {card.company}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: 12, color: "#555", lineHeight: 1.55, margin: "0 0 10px" }}>{card.description}</p>

              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 12 }}>
                {card.tags.map(tag => (
                  <span key={tag} style={{ fontSize: 10, fontWeight: 700, color: NAVY, background: NAVYXL, padding: "3px 8px", borderRadius: 6 }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <button style={{
                width: "100%", padding: "10px 0", background: NAVY, color: WHITE,
                border: "none", borderRadius: 10, fontSize: 12, fontWeight: 800,
                cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1px",
              }}>
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
