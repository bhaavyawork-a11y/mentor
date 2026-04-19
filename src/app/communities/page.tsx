"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/layout/BottomNav";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  role_type: string | null;
  member_count: number;
  posts_this_week: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function groupEmoji(slug: string): string {
  const map: Record<string, string> = {
    "product-managers": "📦", "early-engineers": "⚙️",
    "founders-office": "🚀",  "vc-investing": "💹",
    "growth-marketing": "📈", "data-ai": "🤖",
    "ops-strategy": "🔧",    "sales-bd": "🤝",
  };
  return map[slug] ?? "👥";
}

const FEATURES = [
  { icon: "💬", text: "War Room discussions" },
  { icon: "📚", text: "Curated library" },
  { icon: "🤝", text: "Warm intros & referrals" },
  { icon: "🎯", text: "Verified open roles" },
];

// Fallback communities shown while loading or if DB is empty
const FALLBACK: Community[] = [
  { id: "1", slug: "product-managers",  name: "Product Managers",  description: "APM to CPO.",  role_type: "Product Manager",  member_count: 1204, posts_this_week: 47 },
  { id: "2", slug: "early-engineers",   name: "Early Engineers",   description: "0–3 YOE SWEs.", role_type: "Software Engineer", member_count: 982,  posts_this_week: 63 },
  { id: "3", slug: "founders-office",   name: "Founders' Office",  description: "CxO track.",    role_type: "Founder / CoS",     member_count: 410,  posts_this_week: 28 },
  { id: "4", slug: "vc-investing",      name: "VC & Investing",    description: "Analysts→GPs.", role_type: "Investor",           member_count: 338,  posts_this_week: 19 },
  { id: "5", slug: "growth-marketing",  name: "Growth & Marketing",description: "GTM builders.", role_type: "Growth / Marketing", member_count: 756,  posts_this_week: 41 },
  { id: "6", slug: "data-ai",           name: "Data & AI",         description: "DS, MLE, AI.",  role_type: "Data / AI",          member_count: 621,  posts_this_week: 55 },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CommunitiesPage() {
  const supabase = createClient();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [idx, setIdx]                 = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    supabase
      .from("communities")
      .select("id, slug, name, description, role_type, member_count, posts_this_week")
      .order("member_count", { ascending: false })
      .then(({ data }) => {
        setCommunities((data && data.length > 0) ? data : FALLBACK);
      });
  }, []); // eslint-disable-line

  const total = communities.length;
  const c     = communities[idx];

  const prev = () => setIdx(i => (i - 1 + total) % total);
  const next = () => setIdx(i => (i + 1) % total);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
    touchStartX.current = null;
  };

  if (!c) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTop: "3px solid #0A0A0A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: "100dvh", backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column", fontFamily: "var(--font-sora), Inter, sans-serif", overflowX: "hidden" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px 0", fontSize: 13, fontWeight: 800, color: "#0A0A0A" }}>
        <span>9:41</span>
        <span style={{ fontSize: 11 }}>●●● 🔋</span>
      </div>

      {/* Header: "Groups." + swipe hint */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 20px 12px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: "#0A0A0A", letterSpacing: "-0.8px", margin: 0 }}>Groups.</h1>
        <span style={{ fontSize: 11, color: "#CCCCCC", fontWeight: 600 }}>← swipe →</span>
      </div>

      {/* Spotlight card area */}
      <div style={{ flex: 1, padding: "0 16px 0", display: "flex", flexDirection: "column" }}>
        <div
          key={idx}
          style={{
            backgroundColor: "#0A0A0A",
            borderRadius: 22,
            padding: "20px",
            position: "relative",
            overflow: "hidden",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Glow accent */}
          <div style={{ position: "absolute", top: -50, right: -50, width: 160, height: 160, background: "radial-gradient(circle, rgba(91,138,255,0.15), transparent)", borderRadius: "50%", pointerEvents: "none" }} />

          {/* Group icon + name + role */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, background: "rgba(255,255,255,0.09)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              {groupEmoji(c.slug)}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#FAFAFA", letterSpacing: "-0.5px", lineHeight: 1.1 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: "#5B8AFF", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px", marginTop: 3 }}>
                {c.role_type ?? "Professional"}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#FAFAFA" }}>{c.member_count.toLocaleString()}</div>
              <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase" as const, letterSpacing: "1px" }}>Members</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#FAFAFA" }}>{c.posts_this_week}</div>
              <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase" as const, letterSpacing: "1px" }}>Posts/wk</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#FAFAFA" }}>{Math.floor(c.member_count * 0.026)}</div>
              <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase" as const, letterSpacing: "1px" }}>Online</div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 14 }} />

          {/* What's inside */}
          <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase" as const, letterSpacing: "2px", marginBottom: 10, fontWeight: 700 }}>
            What&apos;s inside
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: "auto" }}>
            {FEATURES.map(f => (
              <div key={f.text} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "9px 10px", display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 14 }}>{f.icon}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, lineHeight: 1.3 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* Apply button */}
          <Link
            href={`/communities/${c.slug}/apply`}
            style={{
              display: "block",
              marginTop: 16,
              width: "100%",
              padding: "13px",
              background: "#FAFAFA",
              color: "#0A0A0A",
              fontSize: 14,
              fontWeight: 900,
              textAlign: "center",
              borderRadius: 12,
              textDecoration: "none",
              letterSpacing: "-0.2px",
            }}
          >
            Apply to join →
          </Link>
        </div>

        {/* Pagination dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "14px 0 10px" }}>
          {communities.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                width: i === idx ? 18 : 5,
                height: 5,
                borderRadius: i === idx ? 3 : "50%",
                background: i === idx ? "#0A0A0A" : "#E5E7EB",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom nav spacer + nav */}
      <BottomNav />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
