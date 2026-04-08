"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  role_type: string | null;
  icon_color: string;
  member_count: number;
  rules: string[];
}

interface Post {
  id: string;
  community_id: string;
  user_id: string;
  type: string;
  content: string;
  channel_type: string;
  link_url: string | null;
  referral_company: string | null;
  referral_role: string | null;
  helpful_count: number;
  reply_count: number;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
    current_job_role: string | null;
  };
}

interface MemberProfile {
  full_name: string | null;
  avatar_url: string | null;
  current_job_role: string | null;
  bio: string | null;
  linkedin_url: string | null;
  location: string | null;
}

interface Member {
  user_id: string;
  joined_at: string;
  status: string;
  can_refer: boolean;
  employer: string | null;
  role: string | null;
  profile?: MemberProfile | MemberProfile[] | null;
}

// ─── Channel config ───────────────────────────────────────────────────────────
const CHANNELS = [
  { type: "discussions", label: "Discussions", emoji: "💬", desc: "Ask questions, share thoughts, start conversations", postTypes: ["Discussion", "Poll"] },
  { type: "upskilling",  label: "Upskilling",  emoji: "📚", desc: "Courses, resources, events and learning opportunities", postTypes: ["Resource", "Event"] },
  { type: "referrals",   label: "Referrals",   emoji: "🤝", desc: "Warm intros, referral requests and job connections", postTypes: ["Referral"] },
  { type: "job_board",   label: "Job Board",   emoji: "💼", desc: "Open roles, hiring announcements and job listings", postTypes: ["Job Listing"] },
];

const POST_TYPE_COLORS: Record<string, string> = {
  "Discussion":  "#e8e4ce",
  "Poll":        "#D3E4FF",
  "Resource":    "#D3F4E8",
  "Event":       "#FDE8C8",
  "Referral":    "#FFE4F0",
  "Job Listing": "#EAE4FF",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupEmoji(slug: string): string {
  const map: Record<string, string> = {
    "product-managers": "📦",
    "early-engineers":  "⚙️",
    "founders-office":  "🚀",
    "vc-investing":     "💹",
    "growth-marketing": "📈",
    "data-ai":          "🤖",
    "ops-strategy":     "🔧",
    "sales-bd":         "🤝",
  };
  return map[slug] ?? "👥";
}

const PALETTE = ["#F7F4D5", "#D3968C", "#839958", "#FFB5C8", "#B5D5FF", "#FFCBA4"];
function avatarBg(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return PALETTE[h % PALETTE.length];
}
function initials(name: string | null | undefined) {
  return (name ?? "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Avatar({ userId, name, size = 32 }: { userId: string; name?: string | null; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3, flexShrink: 0,
      backgroundColor: avatarBg(userId),
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.33, fontWeight: 800, color: "#1a1a1a",
    }}>
      {initials(name)}
    </div>
  );
}

// ─── Post card ────────────────────────────────────────────────────────────────
function PostCard({ post, onHelpful }: { post: Post; onHelpful: (id: string) => void }) {
  const typeColor = POST_TYPE_COLORS[post.type] ?? "#e8e4ce";
  return (
    <div style={{
      backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14,
      padding: "16px 18px", marginBottom: 12,
    }}>
      {/* Author row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar userId={post.user_id} name={post.author?.full_name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>
            {post.author?.full_name ?? "Member"}
          </div>
          <div style={{ fontSize: 11, color: "#839958" }}>
            {post.author?.current_job_role ?? ""}
            {post.author?.current_job_role ? " · " : ""}{relativeTime(post.created_at)}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
          backgroundColor: typeColor, color: "#1a1a1a",
        }}>
          {post.type}
        </span>
      </div>

      {/* Content */}
      <p style={{ fontSize: 14, color: "#1a1a1a", margin: "0 0 12px", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
        {post.content}
      </p>

      {/* Link */}
      {post.link_url && (
        <a href={post.link_url} target="_blank" rel="noopener noreferrer" style={{
          display: "inline-block", fontSize: 12, color: "#0A3323", fontWeight: 600,
          marginBottom: 10, textDecoration: "underline",
        }}>
          {post.link_url.replace(/^https?:\/\//, "").split("/")[0]} ↗
        </a>
      )}

      {/* Referral/Job details */}
      {(post.referral_company || post.referral_role) && (
        <div style={{
          display: "inline-flex", gap: 12, padding: "8px 12px", borderRadius: 8,
          backgroundColor: "#f5f3ea", marginBottom: 10,
        }}>
          {post.referral_company && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>🏢 {post.referral_company}</span>
          )}
          {post.referral_role && (
            <span style={{ fontSize: 12, color: "#555" }}>{post.referral_role}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
        <button onClick={() => onHelpful(post.id)} style={{
          background: "none", border: "none", cursor: "pointer", fontSize: 12,
          color: "#839958", fontFamily: "inherit", padding: 0, display: "flex", alignItems: "center", gap: 4,
        }}>
          👍 {post.helpful_count > 0 ? post.helpful_count : ""} Helpful
        </button>
        <span style={{ fontSize: 12, color: "#b0ab8c" }}>
          💬 {post.reply_count} replies
        </span>
      </div>
    </div>
  );
}

// ─── Post Composer ────────────────────────────────────────────────────────────
function PostComposer({ communityId, channelType, postTypes, onPosted, userId }: {
  communityId: string;
  channelType: string;
  postTypes: string[];
  onPosted: () => void;
  userId: string;
}) {
  const supabase = createClient();
  const [open, setOpen]       = useState(false);
  const [content, setContent] = useState("");
  const [type, setType]       = useState(postTypes[0]);
  const [linkUrl, setLinkUrl] = useState("");
  const [company, setCompany] = useState("");
  const [roleTitle, setRole]  = useState("");
  const [posting, setPosting] = useState(false);

  const showLink    = ["Resource", "Event", "Job Listing"].includes(type);
  const showReferral = ["Referral", "Job Listing"].includes(type);

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    await supabase.from("community_posts").insert({
      community_id: communityId,
      user_id: userId,
      type,
      content: content.trim(),
      channel_type: channelType,
      link_url: linkUrl.trim() || null,
      referral_company: company.trim() || null,
      referral_role: roleTitle.trim() || null,
    });
    setContent(""); setLinkUrl(""); setCompany(""); setRole(""); setOpen(false);
    onPosted();
    setPosting(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "12px 16px", borderRadius: 12, marginBottom: 16,
          border: "1.5px dashed #c8c4ae", backgroundColor: "#fff",
          cursor: "pointer", fontFamily: "inherit", color: "#b0ab8c", fontSize: 13,
        }}
      >
        <Avatar userId={userId} size={28} />
        <span>Write a post in this channel…</span>
      </button>
    );
  }

  return (
    <div style={{
      backgroundColor: "#fff", border: "1.5px solid #0A3323", borderRadius: 14,
      padding: "16px 18px", marginBottom: 16,
    }}>
      {/* Type selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {postTypes.map(pt => (
          <button key={pt} onClick={() => setType(pt)} style={{
            padding: "5px 12px", borderRadius: 99, border: "1.5px solid",
            borderColor: type === pt ? "#0A3323" : "#e8e4ce",
            backgroundColor: type === pt ? "#0A3323" : "#fff",
            color: type === pt ? "#F7F4D5" : "#839958",
            fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>
            {pt}
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={
          type === "Poll" ? "Ask your question…" :
          type === "Referral" ? "I can refer for this role at my company. Here's what to know…" :
          type === "Job Listing" ? "Describe the role, team, and requirements…" :
          type === "Resource" ? "Share what you found and why it's valuable…" :
          "What's on your mind?"
        }
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 0",
          fontSize: 14, border: "none", borderBottom: "1px solid #e8e4ce",
          fontFamily: "inherit", outline: "none", backgroundColor: "transparent",
          color: "#1a1a1a", minHeight: 80, resize: "vertical" as const, lineHeight: 1.6,
        }}
      />

      {showLink && (
        <input
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          placeholder="Link URL (optional)"
          style={{
            width: "100%", boxSizing: "border-box", padding: "8px 0",
            fontSize: 13, border: "none", borderBottom: "1px solid #f0ede0",
            fontFamily: "inherit", outline: "none", color: "#555",
            backgroundColor: "transparent", marginTop: 8,
          }}
        />
      )}
      {showReferral && (
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name" style={{
            flex: 1, boxSizing: "border-box", padding: "8px 10px", fontSize: 12,
            border: "1px solid #e8e4ce", borderRadius: 8, fontFamily: "inherit", outline: "none",
          }} />
          <input value={roleTitle} onChange={e => setRole(e.target.value)} placeholder="Role title" style={{
            flex: 1, boxSizing: "border-box", padding: "8px 10px", fontSize: 12,
            border: "1px solid #e8e4ce", borderRadius: 8, fontFamily: "inherit", outline: "none",
          }} />
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
        <button onClick={() => { setOpen(false); setContent(""); }} style={{
          padding: "8px 16px", borderRadius: 8, border: "1px solid #e8e4ce",
          backgroundColor: "transparent", fontSize: 13, color: "#839958",
          cursor: "pointer", fontFamily: "inherit",
        }}>
          Cancel
        </button>
        <button onClick={handlePost} disabled={!content.trim() || posting} style={{
          padding: "8px 20px", borderRadius: 8, border: "none",
          backgroundColor: content.trim() ? "#0A3323" : "#c8c4ae",
          color: "#F7F4D5", fontSize: 13, fontWeight: 700,
          cursor: content.trim() && !posting ? "pointer" : "default",
          fontFamily: "inherit",
        }}>
          {posting ? "Posting…" : "Post →"}
        </button>
      </div>
    </div>
  );
}

// ─── Member Directory ─────────────────────────────────────────────────────────
function MemberDirectory({ members, onClose }: { members: Member[]; onClose: () => void }) {
  const approvedMembers = members.filter(m => m.status === "approved" || !m.status);
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 50, padding: "0 0 0 0",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        backgroundColor: "#fff", borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: 520, maxHeight: "80vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Handle */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #e8e4ce", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>Members</h3>
            <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>{approvedMembers.length} verified members</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#839958" }}>×</button>
        </div>
        <div style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}>
          {approvedMembers.map(m => {
            const p = Array.isArray(m.profile) ? m.profile[0] : m.profile;
            return (
            <div key={m.user_id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0", borderBottom: "1px solid #f5f3ea",
            }}>
              <Avatar userId={m.user_id} name={p?.full_name} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 1 }}>
                  {p?.full_name ?? "Member"}
                </div>
                <div style={{ fontSize: 11, color: "#839958" }}>
                  {p?.current_job_role ?? m.role ?? ""}
                  {m.employer ? ` · ${m.employer}` : ""}
                  {p?.location ? ` · ${p.location}` : ""}
                </div>
              </div>
              {m.can_refer && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 99,
                  backgroundColor: "#FFE4F0", color: "#c04080",
                }}>
                  Can refer
                </span>
              )}
              {p?.linkedin_url && (
                <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ color: "#0A3323", fontSize: 14 }}>
                  in
                </a>
              )}
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Rules Panel ──────────────────────────────────────────────────────────────
function RulesPanel({ rules }: { rules: string[] }) {
  if (!rules?.length) return null;
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: "16px 18px", marginTop: 16 }}>
      <h4 style={{ fontSize: 12, fontWeight: 800, color: "#0A3323", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>
        Community Rules
      </h4>
      <ol style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {rules.map((rule, i) => (
          <li key={i} style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{rule}</li>
        ))}
      </ol>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CommunityPage() {
  const params  = useParams();
  const router  = useRouter();
  const slug    = params.slug as string;
  const { session } = useSession();
  const supabase    = createClient();
  const userId      = session?.user?.id ?? null;

  const [community, setCommunity]     = useState<Community | null>(null);
  const [isMember, setIsMember]       = useState(false);
  const [members, setMembers]         = useState<Member[]>([]);
  const [activeTab, setActiveTab]     = useState<string>("discussions");
  const [posts, setPosts]             = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [loading, setLoading]         = useState(true);

  // ─── Load community ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("communities")
      .select("id, slug, name, description, role_type, icon_color, member_count, rules")
      .eq("slug", slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { router.push("/communities"); return; }
        setCommunity(data as Community);
        setLoading(false);
      });
  }, [slug, supabase, router]);

  // ─── Check membership ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!community?.id || !userId) return;
    supabase
      .from("community_members")
      .select("status")
      .eq("community_id", community.id)
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        setIsMember(data?.status === "approved" || !!data);
      });
  }, [community?.id, userId, supabase]);

  // ─── Load members ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!community?.id) return;
    supabase
      .from("community_members")
      .select("user_id, joined_at, can_refer, employer, role, status, profile:profiles(full_name, avatar_url, current_job_role, bio, linkedin_url, location)")
      .eq("community_id", community.id)
      .order("joined_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        setMembers((data as Member[]) ?? []);
      });
  }, [community?.id, supabase]);

  // ─── Load posts for active channel ────────────────────────────────────────
  const loadPosts = useCallback(async () => {
    if (!community?.id) return;
    setLoadingPosts(true);
    const { data } = await supabase
      .from("community_posts")
      .select("*, author:profiles(full_name, avatar_url, current_job_role)")
      .eq("community_id", community.id)
      .eq("channel_type", activeTab)
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts((data as Post[]) ?? []);
    setLoadingPosts(false);
  }, [community?.id, activeTab, supabase]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleHelpful = async (postId: string) => {
    if (!userId) return;
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, helpful_count: p.helpful_count + 1 } : p));
    try {
      await supabase.rpc("increment_helpful", { post_id_arg: postId });
    } catch {
      // RPC may not exist yet — optimistic update stays
    }
  };

  if (loading || !community) {
    return (
      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 14, color: "#839958" }}>Loading…</p>
      </div>
    );
  }

  const activeChannel = CHANNELS.find(c => c.type === activeTab) ?? CHANNELS[0];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* ─── Left sidebar (desktop only) ───────────────────────────────────── */}
      <div className="community-channels-panel" style={{
        backgroundColor: "#fff", borderRight: "1px solid #e8e4ce",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        {/* Community header */}
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #e8e4ce" }}>
          <Link href="/communities" style={{ fontSize: 11, color: "#839958", textDecoration: "none", display: "block", marginBottom: 12 }}>
            ← All Groups
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
              backgroundColor: community.icon_color ?? "#FDE68A",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>
              {groupEmoji(community.slug)}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>{community.name}</div>
              <div style={{ fontSize: 10, color: "#839958" }}>{community.member_count.toLocaleString()} members</div>
            </div>
          </div>
        </div>

        {/* Channel nav */}
        <div style={{ padding: "12px 10px", flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#b0ab8c", textTransform: "uppercase", letterSpacing: "0.5px", padding: "0 6px", margin: "0 0 6px" }}>
            Channels
          </p>
          {CHANNELS.map(ch => (
            <button key={ch.type} onClick={() => setActiveTab(ch.type)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 10px", borderRadius: 9, marginBottom: 2,
              border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              backgroundColor: activeTab === ch.type ? "#F0EFD8" : "transparent",
              color: activeTab === ch.type ? "#0A3323" : "#555",
              transition: "background 0.1s",
            }}>
              <span style={{ fontSize: 16 }}>{ch.emoji}</span>
              <span style={{ fontSize: 13, fontWeight: activeTab === ch.type ? 700 : 500 }}>{ch.label}</span>
            </button>
          ))}
        </div>

        {/* Members + Rules */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid #f0ede0" }}>
          <button onClick={() => setShowMembers(true)} style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "9px 10px", borderRadius: 9, border: "none",
            backgroundColor: "transparent", cursor: "pointer", fontFamily: "inherit",
            color: "#555", fontSize: 13,
          }}>
            👥 Members ({members.filter(m => !m.status || m.status === "approved").length})
          </button>
        </div>

        <RulesPanel rules={community.rules} />
        <div style={{ height: 16 }} />
      </div>

      {/* ─── Main content ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", backgroundColor: "#F9F7EC" }}>
        {/* Channel header */}
        <div style={{
          backgroundColor: "#fff", borderBottom: "1px solid #e8e4ce",
          padding: "14px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Mobile: back to communities link */}
            <Link href="/communities" className="mobile-only" style={{ color: "#839958", fontSize: 18, textDecoration: "none" }}>←</Link>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 18 }}>{activeChannel.emoji}</span>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>
                  {activeChannel.label}
                </h2>
              </div>
              <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>{activeChannel.desc}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowMembers(true)} style={{
              padding: "7px 14px", borderRadius: 8, border: "1px solid #e8e4ce",
              backgroundColor: "#fff", cursor: "pointer", fontSize: 12, color: "#555",
              fontFamily: "inherit",
            }}>
              👥 {members.filter(m => !m.status || m.status === "approved").length}
            </button>
            {/* Mobile: channel tab switcher */}
            <button className="mobile-only" onClick={() => setShowMobileNav(!showMobileNav)} style={{
              padding: "7px 12px", borderRadius: 8, border: "1px solid #e8e4ce",
              backgroundColor: "#fff", cursor: "pointer", fontSize: 12, color: "#555",
              fontFamily: "inherit",
            }}>
              # Channels
            </button>
          </div>
        </div>

        {/* Mobile channel nav (drawer) */}
        {showMobileNav && (
          <div style={{
            backgroundColor: "#fff", borderBottom: "1px solid #e8e4ce",
            padding: "8px 16px", display: "flex", gap: 8, overflowX: "auto", flexShrink: 0,
          }}>
            {CHANNELS.map(ch => (
              <button key={ch.type} onClick={() => { setActiveTab(ch.type); setShowMobileNav(false); }} style={{
                padding: "7px 14px", borderRadius: 99, border: "1.5px solid",
                borderColor: activeTab === ch.type ? "#0A3323" : "#e8e4ce",
                backgroundColor: activeTab === ch.type ? "#0A3323" : "#fff",
                color: activeTab === ch.type ? "#F7F4D5" : "#555",
                fontSize: 12, fontWeight: activeTab === ch.type ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const,
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
              }}>
                {ch.emoji} {ch.label}
              </button>
            ))}
          </div>
        )}

        {/* Feed */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 16px" }}>
          {/* Gate: must be member to post */}
          {!isMember && (
            <div style={{
              backgroundColor: "#fff", border: "1.5px solid #e8e4ce", borderRadius: 14,
              padding: "20px 20px", marginBottom: 16, textAlign: "center",
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0A3323", margin: "0 0 6px" }}>
                🔒 This is a verified-members-only group
              </p>
              <p style={{ fontSize: 13, color: "#839958", margin: "0 0 14px" }}>
                Apply to join {community.name} to read and post in channels.
              </p>
              <Link href="/communities" style={{
                display: "inline-block", padding: "10px 20px", backgroundColor: "#0A3323",
                color: "#F7F4D5", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}>
                Apply to join →
              </Link>
            </div>
          )}

          {/* Composer (members only) */}
          {isMember && userId && (
            <PostComposer
              communityId={community.id}
              channelType={activeTab}
              postTypes={activeChannel.postTypes}
              onPosted={loadPosts}
              userId={userId}
            />
          )}

          {/* Posts */}
          {loadingPosts ? (
            <p style={{ fontSize: 13, color: "#839958", textAlign: "center", marginTop: 40 }}>Loading posts…</p>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: 32, margin: "0 0 8px" }}>{activeChannel.emoji}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px" }}>
                No posts in {activeChannel.label} yet
              </p>
              {isMember && (
                <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>Be the first to post here!</p>
              )}
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} onHelpful={handleHelpful} />
            ))
          )}
        </div>
      </div>

      {/* Member directory modal */}
      {showMembers && (
        <MemberDirectory members={members} onClose={() => setShowMembers(false)} />
      )}

      <style>{`
        .mobile-only { display: none; }
        @media (max-width: 767px) {
          .mobile-only { display: flex !important; align-items: center; }
        }
      `}</style>
    </div>
  );
}
