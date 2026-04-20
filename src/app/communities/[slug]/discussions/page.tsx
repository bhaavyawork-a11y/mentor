"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/layout/BottomNav";

// ─── Design tokens ────────────────────────────────────────────────────────────
const DARK   = "#0A0A0A";   // header background — pure dark
const NAVY   = "#1A3A8F";   // online badge bg, active chip
const NAVYXL = "#EEF2FF";   // tag tint
const WHITE  = "#FFFFFF";
const BG     = "#FAFAFA";
const INK    = "#0A0A0A";
const MID    = "#888";
const LIGHT  = "#EBEBEB";

interface Post {
  id: string; content: string; type: string; channel_type: string;
  reply_count: number; helpful_count: number; created_at: string;
  author?: { full_name: string | null };
}
interface Community { id: string; name: string; slug: string; member_count: number; }

// Color-coded tags — text only, NO emojis
const POST_TYPE_TAGS: Record<string, { label: string; color: string; bg: string }> = {
  question:   { label: "Question",   color: NAVY,      bg: NAVYXL    },
  resource:   { label: "Resource",   color: "#065F46", bg: "#DCFCE7" },
  referral:   { label: "Referral",   color: "#92400E", bg: "#FEF3C7" },
  discussion: { label: "Discussion", color: MID,       bg: "#F5F5F5" },
};

const AVATAR_COLORS = ["#16A34A","#D97706","#1A3A8F","#DC2626","#7C3AED","#0891B2"];

// Filter chips KEEP emojis (matches design), post tags do not
const FILTERS = ["All", "❓ Questions", "📎 Resources", "🤝 Referrals"];
const TABS    = ["Discussions", "Library", "Warm Intros", "Open Roles"];

function timeAgo(ts: string) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60)    return "just now";
  if (d < 3600)  return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
}

const DEMO_POSTS: Post[] = [
  { id: "1", content: "PM interview Notion template — helped me land 3 offers. Free to copy.",        type: "resource",  channel_type: "discussions", reply_count: 28, helpful_count: 14, created_at: new Date(Date.now() - 1800000).toISOString(),   author: { full_name: "Kavya S." } },
  { id: "2", content: "How long until you stopped feeling like an imposter as a PM?",                 type: "question",  channel_type: "discussions", reply_count: 41, helpful_count: 8,  created_at: new Date(Date.now() - 7200000).toISOString(),   author: { full_name: "Arjun K." } },
  { id: "3", content: "Referring 2 slots at Series B fintech. Drop me a DM if you're a fit.",         type: "referral",  channel_type: "discussions", reply_count: 9,  helpful_count: 21, created_at: new Date(Date.now() - 14400000).toISOString(),  author: { full_name: "Riya M."  } },
  { id: "4", content: "What frameworks are you using for quarterly planning? OKRs feel too rigid.",   type: "question",  channel_type: "discussions", reply_count: 17, helpful_count: 5,  created_at: new Date(Date.now() - 86400000).toISOString(),  author: { full_name: "Dev P."   } },
];

export default function DiscussionsPage() {
  const params   = useParams();
  const router   = useRouter();
  const slug     = params?.slug as string;
  const supabase = createClient();

  const [community,   setCommunity]   = useState<Community | null>(null);
  const [posts,       setPosts]       = useState<Post[]>([]);
  const [filter,      setFilter]      = useState("All");
  const [draft,       setDraft]       = useState("");
  const [userInitial, setUserInitial] = useState("B");
  const [online,      setOnline]      = useState(32);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: c } = await supabase.from("communities").select("id,name,slug,member_count").eq("slug", slug).single();
      if (c) { setCommunity(c); setOnline(Math.max(1, Math.floor(c.member_count * 0.026))); }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserInitial((user.user_metadata?.full_name ?? user.email ?? "B")[0].toUpperCase());

      if (c) {
        const { data: p } = await supabase
          .from("posts")
          .select("id,content,type,channel_type,reply_count,helpful_count,created_at,author:profiles(full_name)")
          .eq("community_id", c.id).eq("channel_type", "discussions")
          .order("created_at", { ascending: false }).limit(20);
        setPosts((p && p.length > 0) ? (p as unknown as Post[]) : DEMO_POSTS);
      } else {
        setPosts(DEMO_POSTS);
      }
    })();
  }, [slug]); // eslint-disable-line

  const filteredPosts = filter === "All" ? posts : posts.filter(p => {
    if (filter.includes("Question")) return p.type === "question";
    if (filter.includes("Resource")) return p.type === "resource";
    if (filter.includes("Referral")) return p.type === "referral";
    return true;
  });

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column", fontFamily: "var(--font-sora),Inter,sans-serif", paddingBottom: 64 }}>

      {/* ════════════════════════════════════════════════════
          HEADER — dark bg, large group name, navy badge
          ════════════════════════════════════════════════════ */}
      <div style={{ backgroundColor: DARK, flexShrink: 0, position: "sticky", top: 0, zIndex: 100 }}>

        {/* Row 1: back arrow  |  group name (large)  |  online badge */}
        <div style={{ display: "flex", alignItems: "flex-start", padding: "16px 16px 0", gap: 10 }}>

          {/* Back */}
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1, marginTop: 4, flexShrink: 0 }}
            aria-label="Back"
          >
            ←
          </button>

          {/* Group name — BIG, wraps to 2 lines just like mockup */}
          <span style={{ fontSize: 26, fontWeight: 900, color: WHITE, letterSpacing: "-0.7px", lineHeight: 1.15, flex: 1 }}>
            {community?.name ?? "Group"}
          </span>

          {/* Online badge — solid navy rectangle */}
          <div style={{
            backgroundColor: NAVY,
            color: WHITE,
            fontSize: 11,
            fontWeight: 700,
            padding: "5px 10px",
            borderRadius: 8,
            whiteSpace: "nowrap" as const,
            marginTop: 4,
            flexShrink: 0,
            letterSpacing: "0.2px",
          }}>
            ✓ {online} online
          </div>
        </div>

        {/* Row 2: channel tabs */}
        <div style={{ display: "flex", overflowX: "auto", padding: "10px 8px 0", scrollbarWidth: "none" as const }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => {
                if (tab === "Warm Intros") router.push(`/communities/${slug}/warm-intros`);
                else if (tab !== "Discussions") router.push(`/communities/${slug}/discussions`);
              }}
              style={{
                background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: tab === "Discussions" ? 800 : 500,
                padding: "0 14px 10px",
                whiteSpace: "nowrap" as const,
                color: tab === "Discussions" ? WHITE : "rgba(255,255,255,0.4)",
                borderBottom: tab === "Discussions" ? `2.5px solid ${WHITE}` : "2.5px solid transparent",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          FILTER CHIPS — emojis present (matches design)
          ════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", gap: 7, padding: "12px 14px", overflowX: "auto", scrollbarWidth: "none" as const, borderBottom: `1px solid ${LIGHT}`, flexShrink: 0, backgroundColor: WHITE }}>
        {FILTERS.map(f => {
          const active = f === filter;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "6px 14px", borderRadius: 99, whiteSpace: "nowrap" as const,
                border: `1.5px solid ${active ? INK : LIGHT}`,
                background: active ? INK : "transparent",
                color: active ? WHITE : MID,
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.12s",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════
          FEED
          ════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, padding: "10px 14px 8px", backgroundColor: BG }}>
        {filteredPosts.map((post, i) => {
          const tag     = POST_TYPE_TAGS[post.type] ?? POST_TYPE_TAGS.discussion;
          const name    = (post.author as { full_name: string | null } | null)?.full_name ?? "Member";
          const initial = name[0].toUpperCase();
          return (
            <div key={post.id} style={{ background: WHITE, border: `1.5px solid ${LIGHT}`, borderRadius: 14, padding: "14px", marginBottom: 9, cursor: "pointer" }}>

              {/* Author row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: AVATAR_COLORS[i % AVATAR_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: WHITE }}>
                  {initial}
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: INK, flex: 1 }}>{name}</span>
                {/* Tag: text only, color-coded, NO emoji */}
                <span style={{ fontSize: 11, color: tag.color, background: tag.bg, padding: "3px 9px", borderRadius: 6, fontWeight: 700 }}>
                  {tag.label}
                </span>
              </div>

              {/* Content */}
              <p style={{ fontSize: 13, color: "#4B5563", lineHeight: 1.6, margin: "0 0 10px" }}>{post.content}</p>

              {/* Footer: "28 replies · 💾14 · time" */}
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#BBBBBB", fontWeight: 600 }}>
                <span>{post.reply_count} replies</span>
                <span style={{ color: "#DDDDDD", margin: "0 2px" }}>·</span>
                <span>💾{post.helpful_count}</span>
                <span style={{ marginLeft: "auto", color: "#CCCCCC" }}>{timeAgo(post.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════
          COMPOSER — pinned above bottom nav
          ════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", gap: 9, padding: "10px 14px", borderTop: `1.5px solid ${LIGHT}`, backgroundColor: WHITE, alignItems: "center", flexShrink: 0, position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 50 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: DARK, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: WHITE }}>
          {userInitial}
        </div>
        <div style={{ flex: 1, background: "#F3F4F6", borderRadius: 99, padding: "9px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Post something…"
            style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: draft ? INK : "#AAAAAA", fontFamily: "inherit", flex: 1, minWidth: 0 }}
          />
          <div style={{ display: "flex", gap: 10, fontSize: 15, flexShrink: 0 }}>
            <span style={{ cursor: "pointer", opacity: 0.4 }}>❓</span>
            <span style={{ cursor: "pointer", opacity: 0.4 }}>📎</span>
            <span style={{ cursor: "pointer", opacity: 0.4 }}>🤝</span>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
