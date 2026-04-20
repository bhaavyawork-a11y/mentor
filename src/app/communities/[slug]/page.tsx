"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/layout/BottomNav";

interface Community {
  id: string; slug: string; name: string;
  description: string | null; role_type: string | null;
  member_count: number; posts_this_week: number;
}
interface Member { user_id: string; }

const EMOJI: Record<string, string> = {
  "product-managers": "📦", "early-engineers": "⚙️", "founders-office": "🚀",
  "vc-investing": "💹", "growth-marketing": "📈", "data-ai": "🤖",
  "ops-strategy": "🔧", "sales-bd": "🤝",
};
function groupEmoji(slug: string) { return EMOJI[slug] ?? "👥"; }

const CHANNELS = [
  { icon: "💬", name: "Discussions",  path: "discussions" },
  { icon: "📚", name: "Library",      path: "discussions" },
  { icon: "🤝", name: "Warm Intros",  path: "warm-intros" },
  { icon: "🎯", name: "Open Roles",   path: "discussions" },
];

const AVATAR_COLORS = ["#1A3A8F","#16A34A","#DC2626","#D97706","#7C3AED","#0891B2"];

function getLocalMembership(slug: string): boolean {
  try {
    const joined: string[] = JSON.parse(localStorage.getItem("joined_communities") ?? "[]");
    return joined.includes(slug);
  } catch { return false; }
}

export default function GroupDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const slug     = params?.slug as string;
  const supabase = createClient();

  const [community, setCommunity] = useState<Community | null>(null);
  const [members,   setMembers]   = useState<Member[]>([]);
  const [isMember,  setIsMember]  = useState(false);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!slug) return;

    // Check localStorage immediately for instant render
    if (getLocalMembership(slug)) setIsMember(true);

    (async () => {
      const { data: c } = await supabase
        .from("communities")
        .select("id, slug, name, description, role_type, member_count, posts_this_week")
        .eq("slug", slug)
        .single();
      if (!c) { setLoading(false); return; }
      setCommunity(c);

      // Check membership in DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: mem } = await supabase
          .from("community_members")
          .select("user_id")
          .eq("community_id", c.id)
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        if (mem) setIsMember(true);
      }

      // Re-check localStorage (slug from DB)
      if (getLocalMembership(c.slug)) setIsMember(true);

      const { data: mems } = await supabase
        .from("community_members")
        .select("user_id")
        .eq("community_id", c.id)
        .eq("status", "active")
        .limit(5);
      setMembers(mems ?? []);
      setLoading(false);
    })();
  }, [slug]); // eslint-disable-line

  if (loading || !community) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTop: "3px solid #0A0A0A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const online = Math.max(1, Math.floor(community.member_count * 0.026));

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#FAFAFA", display: "flex", flexDirection: "column", fontFamily: "var(--font-sora), Inter, sans-serif" }}>

      {/* ── Dark hero ── */}
      <div style={{ backgroundColor: "#0A0A0A", padding: "0 20px 20px", flexShrink: 0 }}>

        {/* Back arrow */}
        <div style={{ paddingTop: 16, paddingBottom: 4 }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 22, cursor: "pointer", padding: 0, fontFamily: "inherit" }}
          >
            ←
          </button>
        </div>

        {/* Group icon + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <div style={{ width: 46, height: 46, background: "#1A1A1A", borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, border: "1px solid #2A2A2A" }}>
            {groupEmoji(slug)}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#FAFAFA", letterSpacing: "-0.5px" }}>{community.name}</div>
            <div style={{ fontSize: 10, color: "#5B8AFF", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", marginTop: 3 }}>
              {community.role_type ?? "Professional"}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 28 }}>
          {[
            { v: community.member_count.toLocaleString(), l: "Members" },
            { v: community.posts_this_week,               l: "Posts/wk" },
            { v: online,                                  l: "Active now" },
          ].map(s => (
            <div key={s.l}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#FAFAFA" }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "1px" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── White body ── */}
      <div style={{ flex: 1, padding: "20px 20px 24px", overflowY: "auto" }}>

        {/* About */}
        <div style={{ fontSize: 10, fontWeight: 700, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 8 }}>About</div>
        <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, margin: "0 0 20px" }}>
          {community.description ?? `${community.name} — verified practitioners only. Apply to join the conversation.`}
        </p>

        {/* Channels */}
        <div style={{ fontSize: 10, fontWeight: 700, color: "#CCCCCC", textTransform: "uppercase", letterSpacing: "2px", marginBottom: 10 }}>Channels</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20 }}>
          {CHANNELS.map(ch => (
            <div
              key={ch.name}
              onClick={() => router.push(`/communities/${slug}/${ch.path}`)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 14px",
                background: "#FFFFFF",
                border: "1.5px solid #EBEBEB",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 16 }}>{ch.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0A0A0A", flex: 1 }}>{ch.name}</span>
              <span style={{ fontSize: 16, color: "#DDDDDD" }}>›</span>
            </div>
          ))}
        </div>

        {/* Member avatars */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          {(members.length > 0 ? members : [0, 1, 2, 3]).map((_, i) => (
            <div
              key={i}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                border: "2.5px solid #FAFAFA",
                background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "#fff",
                marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i,
                position: "relative",
              }}
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "2.5px solid #FAFAFA", background: "#F5F5F5",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 700, color: "#888",
            marginLeft: -8, position: "relative",
          }}>
            +{Math.max(0, community.member_count - 4).toLocaleString()}
          </div>
        </div>

        {/* CTA */}
        {isMember ? (
          <Link
            href={`/communities/${slug}/discussions`}
            style={{ display: "block", width: "100%", padding: "15px", background: "#0A0A0A", color: "#FAFAFA", fontSize: 15, fontWeight: 900, borderRadius: 12, textDecoration: "none", textAlign: "center", letterSpacing: "-0.2px", boxSizing: "border-box" }}
          >
            Enter group →
          </Link>
        ) : (
          <Link
            href={`/communities/${slug}/apply`}
            style={{ display: "block", width: "100%", padding: "15px", background: "#0A0A0A", color: "#FAFAFA", fontSize: 15, fontWeight: 900, borderRadius: 12, textDecoration: "none", textAlign: "center", letterSpacing: "-0.2px", boxSizing: "border-box" }}
          >
            Apply to join →
          </Link>
        )}
      </div>

      <BottomNav />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
