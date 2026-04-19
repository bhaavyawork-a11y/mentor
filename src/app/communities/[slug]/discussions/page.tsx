"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/layout/BottomNav";

const INK = "#0A0A0A"; const MID = "#888"; const LIGHT = "#EBEBEB";
const BG = "#FAFAFA"; const WHITE = "#FFFFFF"; const NAVY = "#1A3A8F";

interface Post {
  id: string; content: string; type: string; channel_type: string;
  reply_count: number; helpful_count: number; created_at: string;
  author?: { full_name: string | null; };
}

interface Community { id: string; name: string; slug: string; member_count: number; }

const POST_TYPE_TAGS: Record<string, { emoji: string; color: string; bg: string }> = {
  question:  { emoji: "❓", color: NAVY, bg: "#EEF2FF" },
  resource:  { emoji: "📎", color: "#065F46", bg: "#ECFDF5" },
  referral:  { emoji: "🤝", color: "#7C2D12", bg: "#FFF7ED" },
  discussion:{ emoji: "💬", color: MID, bg: "#F5F5F5" },
};

const AVATAR_COLORS = ["#16A34A","#D97706","#1A3A8F","#DC2626","#7C3AED","#0891B2"];
const FILTERS = ["All", "❓ Questions", "📎 Resources", "🤝 Referrals"];
const TABS = ["Discussions", "Library", "Warm Intros", "Open Roles"];

function timeAgo(ts: string) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// Fallback demo posts
const DEMO_POSTS: Post[] = [
  { id: "1", content: "PM interview Notion template — helped me land 3 offers. Free to copy.", type: "resource",  channel_type: "discussions", reply_count: 28, helpful_count: 14, created_at: new Date(Date.now() - 1800000).toISOString(), author: { full_name: "Kavya S." } },
  { id: "2", content: "How long until you stopped feeling like an imposter as a PM?",              type: "question",  channel_type: "discussions", reply_count: 41, helpful_count: 8,  created_at: new Date(Date.now() - 7200000).toISOString(), author: { full_name: "Arjun K." } },
  { id: "3", content: "Referring 2 slots at Series B fintech. Drop me a DM if you're a fit.",    type: "referral",  channel_type: "discussions", reply_count: 9,  helpful_count: 21, created_at: new Date(Date.now() - 14400000).toISOString(), author: { full_name: "Riya M." } },
  { id: "4", content: "What frameworks are you all using for quarterly planning? OKRs feel too rigid for early-stage.", type: "question", channel_type: "discussions", reply_count: 17, helpful_count: 5, created_at: new Date(Date.now() - 86400000).toISOString(), author: { full_name: "Dev P." } },
];

export default function DiscussionsPage() {
  const params   = useParams();
  const router   = useRouter();
  const slug     = params?.slug as string;
  const supabase = createClient();

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts,     setPosts]     = useState<Post[]>([]);
  const [filter,    setFilter]    = useState("All");
  const [draft,     setDraft]     = useState("");
  const [userInitial, setUserInitial] = useState("B");
  const [online,    setOnline]    = useState(32);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: c } = await supabase.from("communities").select("id,name,slug,member_count").eq("slug", slug).single();
      if (c) { setCommunity(c); setOnline(Math.floor(c.member_count * 0.026)); }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const n = user.user_metadata?.full_name ?? user.email ?? "B";
        setUserInitial(n[0].toUpperCase());
      }

      if (c) {
        const { data: p } = await supabase
          .from("posts")
          .select("id,content,type,channel_type,reply_count,helpful_count,created_at,author:profiles(full_name)")
          .eq("community_id", c.id)
          .eq("channel_type", "discussions")
          .order("created_at", { ascending: false })
          .limit(20);
        setPosts((p && p.length > 0) ? (p as unknown as Post[]) : DEMO_POSTS);
      } else {
        setPosts(DEMO_POSTS);
      }
    })();
  }, [slug]); // eslint-disable-line

  const filteredPosts = filter === "All" ? posts : posts.filter(p => {
    if (filter.includes("Question"))  return p.type === "question";
    if (filter.includes("Resource"))  return p.type === "resource";
    if (filter.includes("Referral"))  return p.type === "referral";
    return true;
  });

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column", fontFamily: "var(--font-sora),Inter,sans-serif" }}>

      {/* ── Dark group header ── */}
      <div style={{ backgroundColor: INK, flexShrink: 0 }}>
        {/* Status bar */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 16px 0", fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.5)" }}>
          <span>9:41</span><span style={{ fontSize: 11 }}>●●● 🔋</span>
        </div>

        {/* Group name row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>←</button>
            <span style={{ fontSize: 16, fontWeight: 900, color: "#FAFAFA", letterSpacing: "-0.4px" }}>{community?.name ?? "Group"}</span>
          </div>
          <span style={{ fontSize: 10, color: "#5B8AFF", background: "rgba(91,138,255,0.15)", padding: "3px 8px", borderRadius: 4, fontWeight: 700 }}>
            ✓ {online} online
          </span>
        </div>

        {/* Channel tabs */}
        <div style={{ display: "flex", overflowX: "auto", padding: "0 12px" }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => {
                if (tab === "Warm Intros") router.push(`/communities/${slug}/warm-intros`);
                else if (tab !== "Discussions") router.push(`/communities/${slug}`);
              }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700, padding: "10px 13px", whiteSpace: "nowrap" as const,
                color: tab === "Discussions" ? "#FAFAFA" : "rgba(255,255,255,0.4)",
                borderBottom: tab === "Discussions" ? "2px solid #FAFAFA" : "2px solid transparent",
                fontFamily: "inherit",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Post type filter ── */}
      <div style={{ display: "flex", gap: 6, padding: "10px 14px", overflowX: "auto", borderBottom: `1px solid ${LIGHT}`, flexShrink: 0, backgroundColor: WHITE }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "5px 12px", borderRadius: 99, whiteSpace: "nowrap" as const,
              border: `1.5px solid ${filter === f ? INK : LIGHT}`,
              background: filter === f ? INK : "transparent",
              color: filter === f ? BG : MID,
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.12s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Feed ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px 8px", backgroundColor: BG }}>
        {filteredPosts.map((post, i) => {
          const tag = POST_TYPE_TAGS[post.type] ?? POST_TYPE_TAGS.discussion;
          const name = (post.author as { full_name: string | null } | null)?.full_name ?? "Member";
          const initial = name[0].toUpperCase();
          return (
            <div
              key={post.id}
              style={{
                background: WHITE, border: `1.5px solid ${LIGHT}`, borderRadius: 12,
                padding: "11px 13px", marginBottom: 8, cursor: "pointer",
              }}
              onClick={() => {}}
            >
              {/* Author row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: "#fff",
                }}>
                  {initial}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: INK, flex: 1 }}>{name}</span>
                <span style={{ fontSize: 10, color: tag.color, background: tag.bg, padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>
                  {tag.emoji} {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                </span>
              </div>

              {/* Content */}
              <p style={{ fontSize: 13, color: MID, lineHeight: 1.55, margin: "0 0 8px" }}>{post.content}</p>

              {/* Actions */}
              <div style={{ display: "flex", gap: 14 }}>
                <span style={{ fontSize: 11, color: "#CCCCCC", fontWeight: 600 }}>{post.reply_count} replies</span>
                <span style={{ fontSize: 11, color: "#CCCCCC", fontWeight: 600 }}>💾 {post.helpful_count}</span>
                <span style={{ fontSize: 11, color: "#CCCCCC", fontWeight: 600 }}>{timeAgo(post.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Composer ── */}
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: `1.5px solid ${LIGHT}`, backgroundColor: WHITE, alignItems: "center", flexShrink: 0 }}>
        <div style={{
          width: 30, height: 30, borderRadius: "50%", background: INK,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, color: BG, flexShrink: 0,
        }}>
          {userInitial}
        </div>
        <div style={{ flex: 1, background: "#F5F5F5", borderRadius: 99, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Post something…"
            style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: draft ? INK : "#CCCCCC", fontFamily: "inherit", flex: 1 }}
          />
          <div style={{ display: "flex", gap: 8, fontSize: 14 }}>
            <span style={{ cursor: "pointer", opacity: 0.5 }}>❓</span>
            <span style={{ cursor: "pointer", opacity: 0.5 }}>📎</span>
            <span style={{ cursor: "pointer", opacity: 0.5 }}>🤝</span>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
