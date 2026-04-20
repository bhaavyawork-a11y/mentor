"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/layout/BottomNav";

const NAVY   = "#1A3A8F";
const NAVYL  = "#5B8AFF";
const NAVYXL = "#EEF2FF";
const WHITE  = "#FFFFFF";
const BG     = "#FAFAFA";
const INK    = "#0A0A0A";
const MID    = "#888";
const LIGHT  = "#EBEBEB";

const AVATAR_COLORS = ["#1A3A8F","#16A34A","#DC2626","#D97706","#7C3AED","#0891B2"];

interface Profile {
  id: string; full_name: string | null; current_title: string | null;
  company: string | null; function: string | null; years_experience: string | null;
  linkedin_url: string | null; bio: string | null; created_at: string | null;
}
interface CommunityChip { name: string; slug: string; }

const DEMO_CHIPS: CommunityChip[] = [
  { name: "Product Managers", slug: "product-managers" },
  { name: "Founders Office",  slug: "founders-office"  },
  { name: "Data & AI",        slug: "data-ai"          },
];

const DEMO_TIMELINE = [
  { role: "Product Manager II", company: "Razorpay", period: "Mar 2024 – Present",    current: true  },
  { role: "Associate PM",       company: "Meesho",   period: "Jun 2022 – Feb 2024",   current: false },
  { role: "Business Analyst",   company: "Deloitte", period: "Aug 2021 – May 2022",   current: false },
];

function avatarColor(name: string) {
  let h = 0;
  for (const c of (name ?? "")) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function ProfilePage() {
  const router   = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups,  setGroups]  = useState<CommunityChip[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats,   setStats]   = useState({ referrals: 0, intros: 0, signal: 0, groups: 0 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(p ?? {
        id: user.id,
        full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "You",
        current_title: null, company: null, function: null,
        years_experience: null, linkedin_url: null, bio: null,
        created_at: new Date().toISOString(),
      });

      // Communities
      let chips: CommunityChip[] = [];
      const { data: mems } = await supabase.from("community_members").select("community_id, communities(name, slug)").eq("user_id", user.id).eq("status", "active").limit(8);
      if (mems && mems.length > 0) {
        chips = mems.map((m: { communities: unknown }) => {
          const c = Array.isArray(m.communities) ? m.communities[0] : m.communities;
          return { name: (c as { name: string; slug: string })?.name ?? "", slug: (c as { name: string; slug: string })?.slug ?? "" };
        }).filter(g => g.name);
      }
      try {
        const localSlugs: string[] = JSON.parse(localStorage.getItem("joined_communities") ?? "[]");
        for (const s of localSlugs) {
          if (!chips.find(g => g.slug === s)) {
            const { data: comm } = await supabase.from("communities").select("name,slug").eq("slug", s).maybeSingle();
            if (comm) chips.push({ name: comm.name, slug: comm.slug });
          }
        }
      } catch { /* ignore */ }
      setGroups(chips.length > 0 ? chips : DEMO_CHIPS);

      // Stats
      const { count: gCount } = await supabase.from("community_members").select("id", { count: "exact" }).eq("user_id", user.id).eq("status", "active");
      const { count: rCount } = await supabase.from("career_events").select("id", { count: "exact" }).eq("user_id", user.id).eq("event_type", "referral");
      const { count: iCount } = await supabase.from("career_events").select("id", { count: "exact" }).eq("user_id", user.id).eq("event_type", "intro");
      const localG = (() => { try { return JSON.parse(localStorage.getItem("joined_communities") ?? "[]").length; } catch { return 0; } })();
      setStats({ referrals: rCount ?? 0, intros: iCount ?? 0, signal: rCount ? Math.min(99, (rCount ?? 0) * 17) : 0, groups: Math.max(gCount ?? 0, localG) });
      setLoading(false);
    })();
  }, []); // eslint-disable-line

  if (loading || !profile) {
    return (
      <div style={{ minHeight: "100dvh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, border: `3px solid ${LIGHT}`, borderTop: `3px solid ${NAVY}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const name      = profile.full_name ?? "You";
  const initial   = name[0]?.toUpperCase() ?? "?";
  const bgColor   = avatarColor(name);
  const titleLine = [profile.current_title, profile.company].filter(Boolean).join(" · ") || "Add your role";

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column", fontFamily: "var(--font-sora),Inter,sans-serif", paddingBottom: 64 }}>

      {/* ── Navy hero ── */}
      <div style={{ backgroundColor: NAVY, padding: "28px 20px 24px", flexShrink: 0 }}>

        {/* Avatar */}
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: bgColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: WHITE, marginBottom: 14, border: "3px solid rgba(255,255,255,0.2)" }}>
          {initial}
        </div>

        {/* Name + title */}
        <h1 style={{ fontSize: 24, fontWeight: 900, color: WHITE, margin: "0 0 4px", letterSpacing: "-0.6px" }}>{name}</h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", margin: "0 0 22px", fontWeight: 500 }}>{titleLine}</p>

        {/* Stats row */}
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 18 }}>
          {[
            { v: stats.referrals,                          l: "Referrals" },
            { v: stats.intros,                             l: "Intros"    },
            { v: stats.signal ? `${stats.signal}` : "–",  l: "Signal"    },
            { v: stats.groups,                             l: "Groups"    },
          ].map((s, i) => (
            <div key={s.l} style={{ flex: 1, textAlign: "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.15)" : "none" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: WHITE }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── White body ── */}
      <div style={{ flex: 1, padding: "20px 20px 16px" }}>

        {/* My Groups */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10 }}>My Groups</div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 7 }}>
            {groups.map(g => (
              <button
                key={g.slug}
                onClick={() => router.push(`/communities/${g.slug}`)}
                style={{ padding: "7px 14px", borderRadius: 99, background: NAVYXL, color: NAVY, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                {g.name}
              </button>
            ))}
            <button
              onClick={() => router.push("/communities")}
              style={{ padding: "7px 14px", borderRadius: 99, background: "transparent", color: MID, fontSize: 11, fontWeight: 600, border: `1.5px solid ${LIGHT}`, cursor: "pointer", fontFamily: "inherit" }}
            >
              + Explore
            </button>
          </div>
        </div>

        {/* Career Timeline */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 14 }}>Career Timeline</div>
          <div style={{ position: "relative", paddingLeft: 22 }}>
            <div style={{ position: "absolute", left: 6, top: 6, bottom: 6, width: 1.5, background: NAVYXL }} />
            {DEMO_TIMELINE.map((item, i) => (
              <div key={i} style={{ position: "relative", marginBottom: i < DEMO_TIMELINE.length - 1 ? 20 : 0 }}>
                <div style={{ position: "absolute", left: -22, top: 3, width: 11, height: 11, borderRadius: "50%", background: item.current ? NAVY : NAVYXL, border: `2px solid ${item.current ? NAVYL : LIGHT}` }} />
                <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginBottom: 2 }}>{item.role}</div>
                <div style={{ fontSize: 11, color: MID, fontWeight: 500 }}>{item.company}</div>
                <div style={{ fontSize: 10, color: "#CCCCCC", marginTop: 1 }}>{item.period}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Signal CTA */}
        {stats.referrals === 0 && (
          <button style={{ width: "100%", padding: "14px 16px", background: NAVYXL, border: `1.5px solid rgba(91,138,255,0.3)`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: "inherit", marginBottom: 12 }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: NAVY }}>Give a referral to unlock Signal</div>
              <div style={{ fontSize: 11, color: NAVYL, marginTop: 2 }}>Your credibility score. Visible to recruiters.</div>
            </div>
            <span style={{ fontSize: 18, color: NAVY }}>→</span>
          </button>
        )}

        {/* LinkedIn */}
        {profile.linkedin_url && (
          <a href={`https://linkedin.com/in/${profile.linkedin_url}`} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", textDecoration: "none", borderTop: `1px solid ${LIGHT}` }}>
            <span style={{ fontSize: 14, color: NAVY }}>🔗</span>
            <span style={{ fontSize: 12, color: NAVY, fontWeight: 600 }}>View LinkedIn profile</span>
          </a>
        )}

        {/* Sign out */}
        <button
          onClick={async () => { await supabase.auth.signOut(); router.replace("/"); }}
          style={{ width: "100%", marginTop: 16, padding: "12px 0", background: "transparent", border: `1.5px solid ${LIGHT}`, borderRadius: 10, color: MID, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          Sign out
        </button>
      </div>

      <BottomNav />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
