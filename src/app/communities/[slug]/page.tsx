"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import { useParams } from "next/navigation";

/* ─── Types ─────────────────────────────────────── */
interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  role_type: string | null;
  icon_color: string;
  member_count: number;
  posts_this_week: number;
  rules: string[];
}

interface Post {
  id: string;
  community_id: string;
  user_id: string;
  type: string;
  content: string;
  link_url: string | null;
  referral_company: string | null;
  referral_role: string | null;
  helpful_count: number;
  reply_count: number;
  created_at: string;
  author?: { full_name: string | null; current_job_role: string | null };
}

/* ─── Helpers ───────────────────────────────────── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const PALETTE = ["#F7F4D5", "#D3968C", "#839958", "#FFB5C8", "#B5D5FF"];
function avatarBg(userId: string) {
  let h = 0;
  for (const c of userId) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return PALETTE[h % PALETTE.length];
}

/* ─── Post Card ─────────────────────────────────── */
function PostCard({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false);
  const bg = avatarBg(post.user_id);
  const name = post.author?.full_name ?? "Member";
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const role = post.author?.current_job_role ?? "";
  const long = post.content.length > 220;
  const displayContent = !expanded && long ? post.content.slice(0, 220) + "…" : post.content;

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Author row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#1a1a1a", flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{name}</p>
          {role && <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>{role}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: "#e8e4ce", color: "#839958", borderRadius: 99, padding: "2px 8px" }}>{post.type}</span>
          <span style={{ fontSize: 11, color: "#b0ab8c" }}>{timeAgo(post.created_at)}</span>
        </div>
      </div>

      {/* Referral badge */}
      {post.type === "Job referral" && post.referral_company && (
        <div style={{ backgroundColor: "#F7F4D522", border: "1px solid #F7F4D5", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#8a7200" }}>🤝 Can refer at {post.referral_company}</span>
          {post.referral_role && <span style={{ fontSize: 11, color: "#839958" }}>· {post.referral_role}</span>}
        </div>
      )}

      {/* Content */}
      <p style={{ fontSize: 14, color: "#333", margin: 0, lineHeight: 1.6 }}>
        {displayContent}
        {long && (
          <button onClick={() => setExpanded((o) => !o)} style={{ background: "none", border: "none", cursor: "pointer", color: "#839958", fontSize: 13, fontWeight: 600, padding: 0, marginLeft: 4 }}>
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </p>

      {post.link_url && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#839958", textDecoration: "none" }}>🔗 {post.link_url}</a>
      )}

      {/* Reactions */}
      <div style={{ display: "flex", gap: 16, borderTop: "1px solid #f5f5f5", paddingTop: 10 }}>
        <span style={{ fontSize: 12, color: "#839958" }}>👍 {post.helpful_count} Helpful</span>
        <span style={{ fontSize: 12, color: "#839958" }}>💬 {post.reply_count} replies</span>
      </div>
    </div>
  );
}

/* ─── Post Composer ─────────────────────────────── */
function PostComposer({ communityId, userId, onPosted }: { communityId: string; userId: string; onPosted: () => void }) {
  const supabase = createClient();
  const { profile } = useProfile();
  const [content, setContent] = useState("");
  const [type, setType] = useState("Discussion");
  const [referralCompany, setReferralCompany] = useState("");
  const [referralRole, setReferralRole] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [posting, setPosting] = useState(false);

  const bg = avatarBg(userId);
  const initials = (profile?.full_name ?? "M").split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  const handlePost = async () => {
    if (!content.trim()) return;
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
    setContent("");
    setLinkUrl("");
    setReferralCompany("");
    setReferralRole("");
    setPosting(false);
    onPosted();
  };

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 18, display: "flex", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#1a1a1a", flexShrink: 0 }}>
        {initials}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["Discussion", "Resource", "Job referral"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)} style={{ fontSize: 11, fontWeight: type === t ? 700 : 500, backgroundColor: type === t ? "#0A3323" : "#e8e4ce", color: type === t ? "#839958" : "#839958", border: "none", borderRadius: 99, padding: "4px 12px", cursor: "pointer" }}>{t}</button>
          ))}
        </div>
        <textarea
          className="input"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What&apos;s on your mind?"
          style={{ width: "100%", boxSizing: "border-box", resize: "none" }}
        />
        {type === "Job referral" && (
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" value={referralCompany} onChange={(e) => setReferralCompany(e.target.value)} placeholder="Company I can refer at" style={{ flex: 1 }} />
            <input className="input" value={referralRole} onChange={(e) => setReferralRole(e.target.value)} placeholder="Role (optional)" style={{ flex: 1 }} />
          </div>
        )}
        {type === "Resource" && (
          <input className="input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Link URL (optional)" style={{ width: "100%", boxSizing: "border-box" }} />
        )}
        <button className="btn-primary" onClick={handlePost} disabled={posting || !content.trim()} style={{ opacity: posting || !content.trim() ? 0.6 : 1, alignSelf: "flex-start" }}>
          {posting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
export default function CommunityDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const supabase = createClient();
  const { session } = useSession();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"feed" | "referrals">("feed");

  const load = useCallback(async () => {
    const { data: c } = await supabase.from("communities").select("*").eq("slug", slug).single();
    setCommunity(c as Community);

    if (c) {
      const { data: ps } = await supabase.from("community_posts").select("*, author:profiles(full_name, current_job_role)").eq("community_id", c.id).order("created_at", { ascending: false }).limit(30);
      setPosts((ps as Post[]) ?? []);

      if (session?.user.id) {
        const { data: mem } = await supabase.from("community_members").select("community_id").eq("community_id", c.id).eq("user_id", session.user.id).single();
        setIsMember(!!mem);
      }
    }
    setLoading(false);
  }, [slug, session?.user.id, supabase]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async () => {
    if (!session?.user.id || !community) return;
    await supabase.from("community_members").upsert({ community_id: community.id, user_id: session.user.id });
    setIsMember(true);
  };

  if (loading) return <div style={{ padding: 32 }}><p style={{ color: "#839958" }}>Loading…</p></div>;
  if (!community) return <div style={{ padding: 32 }}><p style={{ color: "#839958" }}>Community not found.</p></div>;

  const referralPosts = posts.filter((p) => p.type === "Job referral");
  const feedPosts = tab === "referrals" ? referralPosts : posts;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 0", display: "grid", gridTemplateColumns: "240px 1fr", gap: 28, alignItems: "start" }}>
      {/* Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>{community.name}</h2>
            <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>{community.member_count.toLocaleString()} members</p>
          </div>

          {isMember ? (
            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#83995822", color: "#0A3323", borderRadius: 99, padding: "4px 12px", alignSelf: "flex-start" }}>You&apos;re a member ✓</span>
          ) : (
            <button className="btn-primary" onClick={handleJoin}>Join community</button>
          )}

          {community.description && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>About</p>
              <p style={{ fontSize: 12, color: "#555", lineHeight: 1.6, margin: 0 }}>{community.description}</p>
            </div>
          )}

          {community.rules?.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Rules</p>
              <ol style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {community.rules.map((r: string, i: number) => (
                  <li key={i} style={{ fontSize: 12, color: "#555" }}>{r}</li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {isMember && (
          <Link href="/experts" style={{ display: "block", backgroundColor: "#F7F4D5", color: "#1a1a1a", fontSize: 12, fontWeight: 800, borderRadius: 12, padding: "12px 16px", textDecoration: "none", textAlign: "center" }}>
            🤝 Post a job referral
          </Link>
        )}
      </div>

      {/* Main feed */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, backgroundColor: "#f5f5f5", padding: 4, borderRadius: 12, width: "fit-content" }}>
          {(["feed", "referrals"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ fontSize: 13, fontWeight: tab === t ? 700 : 500, color: tab === t ? "#1a1a1a" : "#839958", backgroundColor: tab === t ? "#fff" : "transparent", border: "none", borderRadius: 10, padding: "8px 20px", cursor: "pointer", boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none", textTransform: "capitalize" }}>
              {t === "feed" ? "Feed" : `Referrals (${referralPosts.length})`}
            </button>
          ))}
        </div>

        {/* Composer */}
        {isMember && session?.user.id && (
          <PostComposer communityId={community.id} userId={session.user.id} onPosted={load} />
        )}

        {/* Posts */}
        {feedPosts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <p style={{ fontSize: 14, color: "#839958" }}>{isMember ? "Be the first to post!" : "Join to see posts and participate."}</p>
          </div>
        ) : (
          feedPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
