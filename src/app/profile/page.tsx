"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/layout/BottomNav";

const INK = "#0A0A0A"; const MID = "#888"; const LIGHT = "#EBEBEB";
const BG = "#FAFAFA"; const WHITE = "#FFFFFF"; const NAVY = "#1A3A8F"; const NAVYL = "#5B8AFF"; const NAVYXL = "#EEF2FF";

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
  { role: "Product Manager II", company: "Razorpay", period: "Mar 2024 – Present", current: true },
  { role: "Associate PM",       company: "Meesho",   period: "Jun 2022 – Feb 2024", current: false },
  { role: "Business Analyst",   company: "Deloitte", period: "Aug 2021 – May 2022", current: false },
];

function avatarColor(name: string) {
  let h = 0;
  for (const c of (name ?? "")) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function ProfilePage() {
  const router  = useRouter();
  const supabase = createClient();

  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [groups,   setGroups]   = useState<CommunityChip[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [stats,    setStats]    = useState({ referrals: 0, intros: 0, signal: 0, groups: 0 });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }

      // Load profile
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(p ?? {
        id: user.id,
        full_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "You",
        current_title: null, company: null, function: null,
        years_experience: null, linkedin_url: null, bio: null,
        created_at: new Date().toISOString(),
      });

      // Load joined communities (DB first, then localStorage)
      let joinedGroups: CommunityChip[] = [];
      const { data: memberships } = await supabase
        .from("community_members")
        .select("community_id, communities(name, slug)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(8);
      if (memberships && memberships.length > 0) {
        joinedGroups = memberships.map((m: {communities: unknown}) => {
          const c = Array.isArray(m.communities) ? m.communities[0] : m.communities;
          return { name: (c as {name:string;slug:string})?.name ?? "", slug: (c as {name:string;slug:string})?.slug ?? "" };
        }).filter(g => g.name);
      }

      // Merge localStorage memberships
      try {
        const localSlugs: string[] = JSON.parse(localStorage.getItem("joined_communities") ?? "[]");
        for (const slug of localSlugs) {
          if (!joinedGroups.find(g => g.slug === slug)) {
            const { data: comm } = await supabase.from("communities").select("name,slug").eq("slug", slug).maybeSingle();
            if (comm) joinedGroups.push({ name: comm.name, slug: comm.slug });
          }
        }
      } catch { /* ignore */ }

      setGroups(joinedGroups.length > 0 ? joinedGroups : DEMO_CHIPS);

      // Stats
      const { count: groupCount }   = await supabase.from("community_members").select("id", { count: "exact" }).eq("user_id", user.id).eq("status", "active");
      const { count: referralCount } = await supabase.from("career_events").select("id", { count: "exact" }).eq("user_id", user.id).eq("event_type", "referral");
      const { count: introCount }   = await supabase.from("career_events").select("id", { count: "exact" }).eq("user_id", user.id).eq("event_type", "intro");

      const localGroupCount = (() => { try { return JSON.parse(localStorage.getItem("joined_communities") ?? "[]").length; } catch { return 0; } })();

      setStats({
        referrals: referralCount ?? 0,
        intros:    introCount    ?? 0,
        signal:    referralCount ? Math.min(99, (referralCount ?? 0) * 17) : 0,
        groups:    Math.max(groupCount ?? 0, localGroupCount),
      });

      setLoading(false);
    })();
  }, []); // eslint-disable-line

  if (loading || !profile) {
    return (
      <div style={{ minHeight: "100dvh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, border: `3px solid ${LIGHT}`, borderTop: `3px solid ${INK}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const name    = profile.full_name ?? "You";
  const initial = name[0]?.toUpperCase() ?? "?";
  const bgColor = avatarColor(name);
  const titleLine = [profile.current_title, profile.company].filter(Boolean).join(" · ") || "Add your role";

  const timeline = DEMO_TIMELINE;

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column", fontFamily: "var(--font-sora),Inter,sans-serif", paddingBottom: 64 }}>

      {/* ── Dark hero ── */}
      <div style={{ backgroundColor: INK, padding: "24px 20px 22px", flexShrink: 0 }}>
        {/* Avatar */}
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: bgColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: WHITE, marginBottom: 14, border: "2px solid rgba(255,255,255,0.12)" }}>
          {initial}
        </div>

        {/* Name */}
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#FAFAFA", margin: "0 0 4px", letterSpacing: "-0.6px" }}>{name}</h1>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", margin: "0 0 20px", fontWeight: 500 }}>{titleLine}</p>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 0, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 16 }}>
          {[
            { v: stats.referrals, l: "Referrals" },
            { v: stats.intros,    l: "Intros" },
            { v: stats.signal ? `${stats.signal}` : "–", l: "Signal" },
            { v: stats.groups,    l: "Groups" },
          ].map((s, i) => (
            <div key={s.l} style={{ flex: 1, textAlign: "center", borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.07)" : "none", padding: "0 4px" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#FAFAFA" }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "1px", marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── White body ── */}
      <div style={{ flex: 1, padding: "20px 20px 16px" }}>

        {/* Groups */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10 }}>My Groups</div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 7 }}>
            {groups.map(g => (
              <button
                key={g.slug}
                onClick={() => router.push(`/communities/${g.slug}`)}
                style={{ padding: "7px 13px", borderRadius: 99, background: NAVYXL, color: NAVY, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                {g.name}
              </button>
            ))}
            <button
              onClick={() => router.push("/communities")}
              style={{ padding: "7px 13px", borderRadius: 99, background: "transparent", color: MID, fontSize: 11, fontWeight: 600, border: `1.5px solid ${LIGHT}`, cursor: "pointer", fontFamily: "inherit" }}
            >
              + Explore groups
            </button>
          </div>
        </div>

        {/* Career Timeline */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 12 }}>Career Timeline</div>
          <div style={{ position: "relative", paddingLeft: 20 }}>
            {/* Vertical line */}
            <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 1.5, background: LIGHT }} />
            {timeline.map((item, i) => (
              <div key={i} style={{ position: "relative", marginBottom: i < timeline.length - 1 ? 18 : 0 }}>
                {/* Dot */}
                <div style={{
                  position: "absolute", left: -20, top: 3,
                  width: 10, height: 10, borderRadius: "50%",
                  background: item.current ? NAVY : LIGHT,
                  border: `2px solid ${item.current ? NAVYL : "#CCCCCC"}`,
                }} />
                <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginBottom: 2 }}>{item.role}</div>
                <div style={{ fontSize: 11, color: MID, fontWeight: 500 }}>{item.company}</div>
                <div style={{ fontSize: 10, color: "#CCCCCC", marginTop: 1 }}>{item.period}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Signal CTA */}
        {stats.referrals === 0 && (
          <button
            style={{
              width: "100%", padding: "14px 16px", background: NAVYXL, border: `1.5px solid ${NAVYL}`,
              borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: NAVY }}>Give a referral to unlock Signal</div>
              <div style={{ fontSize: 11, color: NAVYL, marginTop: 2 }}>Your credibility score. Visible to recruiters.</div>
            </div>
            <span style={{ fontSize: 18, color: NAVY }}>→</span>
          </button>
        )}

        {/* Edit / LinkedIn */}
        {profile.linkedin_url && (
          <a
            href={`https://linkedin.com/in/${profile.linkedin_url}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", textDecoration: "none", marginTop: 12, borderTop: `1px solid ${LIGHT}` }}
          >
            <span style={{ fontSize: 14, color: NAVY }}>🔗</span>
            <span style={{ fontSize: 12, color: NAVY, fontWeight: 600 }}>View LinkedIn profile</span>
          </a>
        )}

        {/* Sign out */}
        <button
          onClick={async () => { await supabase.auth.signOut(); router.replace("/"); }}
          style={{ width: "100%", marginTop: 20, padding: "12px 0", background: "transparent", border: `1.5px solid ${LIGHT}`, borderRadius: 10, color: MID, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
        >
          Sign out
        </button>
      </div>

      <BottomNav />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
