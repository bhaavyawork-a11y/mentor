"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Post {
  id: string;
  community_id: string;
  user_id: string;
  type: "Discussion" | "Resource" | "Job referral";
  content: string;
  link_url: string | null;
  referral_company: string | null;
  referral_role: string | null;
  helpful_count: number;
  reply_count: number;
  created_at: string;
  author?: {
    full_name: string | null;
    current_job_role: string | null;
    target_role: string | null;
  };
  community?: {
    name: string;
    slug: string;
  };
}

interface Community {
  id: string;
  slug: string;
  name: string;
  member_count: number;
  posts_this_week: number;
  icon_color: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const AVATAR_PALETTE = ["#F7F4D5", "#D3968C", "#839958", "#105666", "#B5D5FF", "#FFB5C8"];
function avatarBg(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}
function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const TYPE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  "Discussion":  { bg: "#e8e4ce",   color: "#839958", label: "Discussion"  },
  "Resource":    { bg: "#B5D5FF33", color: "#105666", label: "Resource"    },
  "Job referral":{ bg: "#D3968C22", color: "#a05a44", label: "Referral 🤝" },
};

// ─── Post Composer ────────────────────────────────────────────────────────────

function PostComposer({
  userId,
  userInitials,
  userAvatarBg,
  communities,
  onPosted,
}: {
  userId: string;
  userInitials: string;
  userAvatarBg: string;
  communities: Community[];
  onPosted: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [type, setType] = useState<"Discussion" | "Resource" | "Job referral">("Discussion");
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? "");
  const [referralCompany, setReferralCompany] = useState("");
  const [referralRole, setReferralRole] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (communities.length > 0 && !communityId) setCommunityId(communities[0].id);
  }, [communities, communityId]);

  const handlePost = async () => {
    if (!content.trim() || !communityId) return;
    setPosting(true);
    await supabase.from("community_posts").insert({
      community_id: communityId,
      user_id: userId,
      type,
      content: content.trim(),
      link_url: linkUrl || null,
      referral_company: type === "Job referral" ? referralCompany : null,
      referral_role: type === "Job referral" ? referralRole : null,
    });
    setContent(""); setLinkUrl(""); setReferralCompany(""); setReferralRole("");
    setOpen(false);
    setPosting(false);
    onPosted();
  };

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 16, marginBottom: 12 }}>
      {/* Collapsed trigger row */}
      {!open ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: userAvatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
            {userInitials}
          </div>
          <button
            onClick={() => setOpen(true)}
            style={{ flex: 1, textAlign: "left", background: "#F9F7EC", border: "1px solid #e8e4ce", borderRadius: 20, padding: "10px 16px", fontSize: 13, color: "#839958", cursor: "pointer", fontFamily: "inherit" }}
          >
            Share a win, question, or referral offer...
          </button>
        </div>
      ) : (
        /* Expanded composer */
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: userAvatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
            {userInitials}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {/* Post type pills */}
            <div style={{ display: "flex", gap: 6 }}>
              {(["Discussion", "Resource", "Job referral"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    fontSize: 11, fontWeight: type === t ? 700 : 500, border: "none", borderRadius: 99, cursor: "pointer",
                    padding: "4px 12px",
                    backgroundColor: type === t ? "#0A3323" : "#e8e4ce",
                    color: type === t ? "#F7F4D5" : "#839958",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Community selector */}
            {communities.length > 0 && (
              <select
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                style={{ fontSize: 12, color: "#555", border: "1px solid #e8e4ce", borderRadius: 8, padding: "6px 10px", backgroundColor: "#fff", fontFamily: "inherit" }}
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}

            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={type === "Job referral" ? "I can refer people at [company]. Share your role and a bit about yourself..." : "What's on your mind?"}
              style={{ width: "100%", boxSizing: "border-box", resize: "none", fontSize: 13, border: "1px solid #e8e4ce", borderRadius: 10, padding: "10px 12px", fontFamily: "inherit", lineHeight: 1.6 }}
            />

            {type === "Job referral" && (
              <div style={{ display: "flex", gap: 8 }}>
                <input value={referralCompany} onChange={(e) => setReferralCompany(e.target.value)} placeholder="Company" style={{ flex: 1, fontSize: 12, border: "1px solid #e8e4ce", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit" }} />
                <input value={referralRole} onChange={(e) => setReferralRole(e.target.value)} placeholder="Role (optional)" style={{ flex: 1, fontSize: 12, border: "1px solid #e8e4ce", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit" }} />
              </div>
            )}
            {type === "Resource" && (
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Link URL (optional)" style={{ width: "100%", boxSizing: "border-box", fontSize: 12, border: "1px solid #e8e4ce", borderRadius: 8, padding: "8px 10px", fontFamily: "inherit" }} />
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handlePost}
                disabled={posting || !content.trim()}
                style={{ fontSize: 12, fontWeight: 700, backgroundColor: "#0A3323", color: "#F7F4D5", border: "none", borderRadius: 8, padding: "8px 20px", cursor: "pointer", opacity: posting || !content.trim() ? 0.6 : 1 }}
              >
                {posting ? "Posting…" : "Post"}
              </button>
              <button onClick={() => { setOpen(false); setContent(""); }} style={{ fontSize: 12, color: "#839958", background: "none", border: "none", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, currentUserId, onLike }: { post: Post; currentUserId: string; onLike: (postId: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const authorName = post.author?.full_name ?? "Member";
  const authorRole = post.author?.current_job_role ?? "";
  const bg = avatarBg(post.user_id);
  const inits = initials(authorName);
  const typeStyle = TYPE_STYLE[post.type] ?? TYPE_STYLE["Discussion"];
  const long = post.content.length > 240;
  const displayContent = !expanded && long ? post.content.slice(0, 240) + "…" : post.content;

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 18, marginBottom: 10 }}>
      {/* Header */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
          {inits}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{authorName}</span>
            <span style={{ fontSize: 11, backgroundColor: typeStyle.bg, color: typeStyle.color, borderRadius: 99, padding: "2px 8px", fontWeight: 600 }}>
              {typeStyle.label}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#839958", marginTop: 2 }}>
            {authorRole && <span>{authorRole}</span>}
            {authorRole && <span style={{ margin: "0 4px" }}>·</span>}
            <span>{timeAgo(post.created_at)}</span>
            {post.community && (
              <>
                <span style={{ margin: "0 4px" }}>·</span>
                <Link href={`/communities/${post.community.slug}`} style={{ color: "#105666", textDecoration: "none", fontWeight: 600 }}>
                  {post.community.name}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Referral badge */}
      {post.type === "Job referral" && post.referral_company && (
        <div style={{ backgroundColor: "#D3968C11", border: "1px solid #D3968C33", borderRadius: 8, padding: "8px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#a05a44" }}>🤝 Can refer at {post.referral_company}</span>
          {post.referral_role && <span style={{ fontSize: 12, color: "#839958" }}>· {post.referral_role}</span>}
        </div>
      )}

      {/* Content */}
      <p style={{ fontSize: 14, color: "#333", lineHeight: 1.65, margin: "0 0 12px", whiteSpace: "pre-wrap" }}>
        {displayContent}
        {long && (
          <button onClick={() => setExpanded((o) => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "#839958", fontSize: 13, fontWeight: 600, padding: 0, marginLeft: 4 }}>
            {expanded ? " Show less" : " …more"}
          </button>
        )}
      </p>

      {post.link_url && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#105666", textDecoration: "none", display: "block", marginBottom: 12 }}>
          🔗 {post.link_url}
        </a>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, borderTop: "1px solid #f5f0e8", paddingTop: 10 }}>
        <button
          onClick={() => onLike(post.id)}
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#839958", background: "none", border: "none", cursor: "pointer", padding: "5px 10px", borderRadius: 8, fontFamily: "inherit" }}
        >
          👍 {post.helpful_count > 0 && <span>{post.helpful_count}</span>} Helpful
        </button>
        <button style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#839958", background: "none", border: "none", cursor: "pointer", padding: "5px 10px", borderRadius: 8, fontFamily: "inherit" }}>
          💬 {post.reply_count > 0 && <span>{post.reply_count}</span>} Reply
        </button>
        {post.type === "Job referral" && currentUserId !== post.user_id && (
          <button style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "#0A3323", background: "#F7F4D5", border: "1px solid #e8e4ce", cursor: "pointer", padding: "5px 12px", borderRadius: 8, fontFamily: "inherit" }}>
            Request referral →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Left sidebar: profile card ───────────────────────────────────────────────

function ProfileCard({ displayName, role, targetRole, circlesCount }: {
  displayName: string; role: string | null; targetRole: string | null; circlesCount: number;
}) {
  const bg = avatarBg(displayName);
  const inits = initials(displayName);
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
      {/* Banner */}
      <div style={{ height: 56, background: "linear-gradient(135deg, #0A3323 0%, #105666 100%)" }} />
      {/* Avatar */}
      <div style={{ padding: "0 16px 16px", position: "relative" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          backgroundColor: bg, border: "3px solid #fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800,
          position: "absolute", top: -26,
        }}>
          {inits}
        </div>
        <div style={{ paddingTop: 30 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: "0 0 2px" }}>{displayName}</p>
          {role && <p style={{ fontSize: 11, color: "#839958", margin: "0 0 2px" }}>{role}</p>}
          {targetRole && <p style={{ fontSize: 11, color: "#105666", margin: 0 }}>→ {targetRole}</p>}
        </div>
        <div style={{ borderTop: "1px solid #f5f0e8", marginTop: 12, paddingTop: 12, display: "flex", justifyContent: "space-between" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "#0A3323", margin: 0 }}>{circlesCount}</p>
            <p style={{ fontSize: 10, color: "#839958", margin: 0 }}>circles</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <Link href="/profile" style={{ fontSize: 11, fontWeight: 700, color: "#0A3323", textDecoration: "none" }}>Edit profile →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Right sidebar: circles + suggestions ────────────────────────────────────

function RightSidebar({ communities, myCommIds }: { communities: Community[]; myCommIds: Set<string> }) {
  const myComms = communities.filter((c) => myCommIds.has(c.id)).slice(0, 4);
  const suggestedComms = communities.filter((c) => !myCommIds.has(c.id)).slice(0, 3);
  const PALETTE = ["#F7F4D5", "#D3968C", "#839958", "#B5D5FF", "#FFB5C8"];
  function commBg(id: string) {
    let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
    return PALETTE[h % PALETTE.length];
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* My circles */}
      {myComms.length > 0 && (
        <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>My circles</p>
          {myComms.map((c) => (
            <Link key={c.id} href={`/communities/${c.slug}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", padding: "7px 0", borderBottom: "1px solid #f5f0e8" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: commBg(c.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                {c.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#0A3323", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                <p style={{ fontSize: 10, color: "#839958", margin: 0 }}>{c.posts_this_week} posts this week</p>
              </div>
            </Link>
          ))}
          <Link href="/communities" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#839958", textDecoration: "none", marginTop: 10 }}>
            See all circles →
          </Link>
        </div>
      )}

      {/* Suggested circles */}
      {suggestedComms.length > 0 && (
        <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Circles to join</p>
          {suggestedComms.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid #f5f0e8" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: commBg(c.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                {c.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#0A3323", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                <p style={{ fontSize: 10, color: "#839958", margin: 0 }}>{c.member_count.toLocaleString("en-IN")} members</p>
              </div>
              <Link href={`/communities/${c.slug}`} style={{ fontSize: 10, fontWeight: 700, color: "#0A3323", textDecoration: "none", backgroundColor: "#F7F4D5", border: "1px solid #e8e4ce", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>
                Join
              </Link>
            </div>
          ))}
          <Link href="/communities" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#839958", textDecoration: "none", marginTop: 10 }}>
            Browse all circles →
          </Link>
        </div>
      )}

      {/* Career assistant promo */}
      <div style={{ backgroundColor: "#0A3323", borderRadius: 14, padding: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: "#F7F4D5", margin: "0 0 6px" }}>✨ Career Assistant</p>
        <p style={{ fontSize: 11, color: "rgba(247,244,213,0.6)", margin: "0 0 12px", lineHeight: 1.5 }}>
          Salary intel, interview prep, and offer evaluation — all in one chat.
        </p>
        <Link href="/assistant" style={{ display: "block", textAlign: "center", fontSize: 12, fontWeight: 700, color: "#0A3323", backgroundColor: "#F7F4D5", borderRadius: 8, padding: "8px 0", textDecoration: "none" }}>
          Open Assistant →
        </Link>
      </div>
    </div>
  );
}

// ─── Feed empty state ─────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: "48px 32px", textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>Your feed is empty</p>
      <p style={{ fontSize: 13, color: "#839958", margin: "0 0 20px", lineHeight: 1.6 }}>
        Join circles to see posts from people in your target companies and roles.
      </p>
      <Link href="/communities" style={{ display: "inline-block", fontSize: 13, fontWeight: 700, backgroundColor: "#0A3323", color: "#F7F4D5", borderRadius: 10, padding: "10px 24px", textDecoration: "none" }}>
        Find your circles →
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const supabase       = createClient();
  const { session }    = useSession();
  const { profile }    = useProfile();
  const [posts, setPosts]           = useState<Post[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommIds, setMyCommIds]    = useState<Set<string>>(new Set());
  const [circlesCount, setCirclesCount] = useState(0);
  const [loading, setLoading]        = useState(true);
  const [filter, setFilter]          = useState<"all" | "referrals">("all");

  const userId = session?.user?.id ?? "";

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Load communities
    const { data: comms } = await supabase
      .from("communities")
      .select("id, slug, name, member_count, posts_this_week, icon_color")
      .order("member_count", { ascending: false });
    const allComms = (comms as Community[]) ?? [];
    setCommunities(allComms);

    // Load my memberships
    const { data: mem } = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", userId);
    const memberSet = new Set((mem ?? []).map((m: { community_id: string }) => m.community_id));
    setMyCommIds(memberSet);
    setCirclesCount(memberSet.size);

    // Load posts — from my circles first, then fill with all public posts
    const myCommList = Array.from(memberSet);
    let allPosts: Post[] = [];

    if (myCommList.length > 0) {
      const { data: myPosts } = await supabase
        .from("community_posts")
        .select("*, author:profiles(full_name, current_job_role, target_role), community:communities(name, slug)")
        .in("community_id", myCommList)
        .order("created_at", { ascending: false })
        .limit(30);
      allPosts = (myPosts as Post[]) ?? [];
    }

    // If fewer than 10 posts from my circles, supplement with latest from all communities
    if (allPosts.length < 10) {
      const existingIds = new Set(allPosts.map((p) => p.id));
      const { data: globalPosts } = await supabase
        .from("community_posts")
        .select("*, author:profiles(full_name, current_job_role, target_role), community:communities(name, slug)")
        .order("created_at", { ascending: false })
        .limit(20);
      const extras = ((globalPosts as Post[]) ?? []).filter((p) => !existingIds.has(p.id));
      allPosts = [...allPosts, ...extras].slice(0, 30);
    }

    setPosts(allPosts);
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => { load(); }, [load]);

  const handleLike = async (postId: string) => {
    if (!userId) return;
    // Optimistic update
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, helpful_count: p.helpful_count + 1 } : p));
    await supabase.from("post_likes").insert({ post_id: postId, user_id: userId }).then(({ error }) => {
      // If duplicate (already liked), revert
      if (error) setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, helpful_count: Math.max(p.helpful_count - 1, 0) } : p));
    });
  };

  const displayName = profile?.full_name ?? (session?.user?.email ?? "").split("@")[0] ?? "You";
  const userBg      = userId ? avatarBg(userId) : "#D3968C";
  const userInits   = initials(displayName);

  const myMemberComms = communities.filter((c) => myCommIds.has(c.id));
  const filteredPosts = filter === "referrals" ? posts.filter((p) => p.type === "Job referral") : posts;

  // If not logged in, show a prompt
  if (!userId && !loading) {
    return (
      <div style={{ maxWidth: 600, margin: "60px auto", textAlign: "center", padding: "0 24px" }}>
        <p style={{ fontSize: 24, fontWeight: 800, color: "#0A3323", margin: "0 0 12px" }}>Sign in to see your feed</p>
        <p style={{ fontSize: 14, color: "#839958", margin: "0 0 24px" }}>Join communities, see referral offers, and connect with your circle.</p>
        <Link href="/auth/login" style={{ fontSize: 14, fontWeight: 700, backgroundColor: "#0A3323", color: "#F7F4D5", borderRadius: 10, padding: "12px 28px", textDecoration: "none" }}>
          Sign in →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "220px 1fr 280px", gap: 16, alignItems: "start", padding: "8px 0 32px" }}>

      {/* ── Left: profile card + quick nav ── */}
      <div>
        {userId && (
          <ProfileCard
            displayName={displayName}
            role={profile?.current_job_role ?? null}
            targetRole={profile?.target_role ?? null}
            circlesCount={circlesCount}
          />
        )}
        {/* Quick nav */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: "12px 8px" }}>
          {[
            { href: "/communities", icon: "👥", label: "My circles"       },
            { href: "/jobs",        icon: "💼", label: "Jobs for you"     },
            { href: "/assistant",   icon: "✨", label: "Career assistant" },
            { href: "/bookings",    icon: "📅", label: "My sessions"      },
            { href: "/experts",     icon: "🎓", label: "Find experts"     },
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", padding: "8px 12px", borderRadius: 8, color: "#555", fontSize: 13 }}>
              <span>{icon}</span>{label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Center: feed ── */}
      <div>
        {/* Composer */}
        {userId && (
          <PostComposer
            userId={userId}
            userInitials={userInits}
            userAvatarBg={userBg}
            communities={myMemberComms}
            onPosted={load}
          />
        )}

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
          {([["all", "All posts"], ["referrals", "Referral offers 🤝"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                fontSize: 12, fontWeight: filter === key ? 700 : 500, border: "none", cursor: "pointer",
                padding: "6px 14px", borderRadius: 20,
                backgroundColor: filter === key ? "#0A3323" : "#e8e4ce",
                color: filter === key ? "#F7F4D5" : "#839958",
                fontFamily: "inherit",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Posts */}
        {loading ? (
          <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 32, textAlign: "center" }}>
            <p style={{ color: "#839958", fontSize: 13 }}>Loading your feed…</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <EmptyFeed />
        ) : (
          filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={userId} onLike={handleLike} />
          ))
        )}
      </div>

      {/* ── Right: circles + suggestions ── */}
      <div>
        <RightSidebar communities={communities} myCommIds={myCommIds} />
      </div>
    </div>
  );
}
