"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useParams } from "next/navigation";
import PostCard from "@/app/feed/PostCard";
import PostComposer, { type FeedPost } from "@/app/feed/PostComposer";

/* ─── Types ─────────────────────────────────────── */
interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  member_count: number;
  posts_this_week: number | null;
}

interface CommunityMember {
  id: string;
  user_id: string;
  role: string;
  can_refer: boolean;
  employer: string | null;
  joined_at: string;
  profile: {
    id: string;
    full_name: string | null;
    current_job_role: string | null;
    avatar_url: string | null;
  } | null;
}

/* ─── Helpers ────────────────────────────────────── */

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const AVATAR_COLORS = ["#0a66c2", "#7c3aed", "#db2777", "#d97706", "#059669"];
function avatarColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

/* ─── Referrer Card ─────────────────────────────── */
function ReferrerCard({
  member,
  communityId,
  requestedIds,
  onRequestSent,
}: {
  member: CommunityMember;
  communityId: string;
  requestedIds: Set<string>;
  onRequestSent: (userId: string) => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const profile = member.profile;
  const name = profile?.full_name ?? "Member";
  const role = profile?.current_job_role ?? "";
  const userId = member.user_id;
  const hasRequested = requestedIds.has(userId);

  const handleRequest = async () => {
    if (hasRequested || !member.employer) return;
    setRequesting(true);
    const res = await fetch("/api/referrals/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referrer_id: userId,
        community_id: communityId,
        company: member.employer,
      }),
    });
    if (res.ok || res.status === 409) onRequestSent(userId);
    setRequesting(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #f0eeea" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: avatarColor(userId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
        {initials(name)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>{name}</p>
        {role && <p style={{ fontSize: 11, color: "#666", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{role}</p>}
        {member.employer && <p style={{ fontSize: 11, fontWeight: 600, color: "#0a66c2", margin: "1px 0 0" }}>@ {member.employer}</p>}
      </div>
      <button
        onClick={handleRequest}
        disabled={hasRequested || requesting || !member.employer}
        style={{
          fontSize: 12, fontWeight: 700,
          backgroundColor: hasRequested ? "#dcfce7" : "#fff",
          color: hasRequested ? "#166534" : "#0a66c2",
          border: "1.5px solid " + (hasRequested ? "#86efac" : "#0a66c2"),
          borderRadius: 16, padding: "5px 12px",
          cursor: hasRequested || !member.employer ? "default" : "pointer",
          fontFamily: "inherit", flexShrink: 0,
        }}
      >
        {hasRequested ? "Sent ✓" : requesting ? "Sending…" : "Connect"}
      </button>
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
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [referrers, setReferrers] = useState<CommunityMember[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "members" | "jobs">("posts");
  const [showAllReferrers, setShowAllReferrers] = useState(false);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [joining, setJoining] = useState(false);

  const userId = session?.user.id ?? "";

  const load = useCallback(async () => {
    const { data: c } = await supabase.from("communities").select("*").eq("slug", slug).single();
    if (!c) { setLoading(false); return; }
    setCommunity(c as Community);

    const [postsRes, membersRes] = await Promise.all([
      // Posts for this community
      supabase
        .from("posts")
        .select(`
          *,
          author:profiles!posts_author_id_fkey(id, full_name, current_job_role, avatar_url),
          community:communities(name, slug)
        `)
        .eq("community_id", c.id)
        .order("created_at", { ascending: false })
        .limit(30),

      // Members with profiles
      supabase
        .from("community_members")
        .select(`
          id, user_id, role, can_refer, employer, joined_at,
          profile:profiles!community_members_user_id_fkey(id, full_name, current_job_role, avatar_url)
        `)
        .eq("community_id", c.id)
        .order("joined_at", { ascending: true }),
    ]);

    type RawMember = {
      id: string; user_id: string; role: string; can_refer: boolean; employer: string | null; joined_at: string;
      profile: CommunityMember["profile"] | CommunityMember["profile"][];
    };
    const allMembers: CommunityMember[] = ((membersRes.data ?? []) as RawMember[]).map((m) => ({
      ...m,
      profile: Array.isArray(m.profile) ? (m.profile[0] ?? null) : m.profile,
    }));
    setMembers(allMembers);
    setReferrers(allMembers.filter((m) => m.can_refer && m.employer));

    // Check liked status
    const rawPosts = (postsRes.data ?? []) as FeedPost[];
    let likedSet = new Set<string>();
    if (userId && rawPosts.length > 0) {
      const { data: likes } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", rawPosts.map((p) => p.id));
      likedSet = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
    }
    setPosts(rawPosts.map((p) => ({ ...p, liked: likedSet.has(p.id) })));

    // Check membership
    if (userId) {
      const { data: mem } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", c.id)
        .eq("user_id", userId)
        .single();
      setIsMember(!!mem);
    }

    setLoading(false);
  }, [slug, userId, supabase]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async () => {
    if (!userId || !community) return;
    setJoining(true);
    await fetch(`/api/communities/${community.id}/join`, { method: "POST" });
    setIsMember(true);
    setJoining(false);
    load();
  };

  const handlePostCreated = (post: FeedPost) => {
    setPosts((prev) => [post, ...prev]);
  };

  const handleReferralRequest = (referrerId: string) => {
    setRequestedIds((prev) => new Set(prev).add(referrerId));
  };

  const userInitials = (session?.user.email ?? "M").split("@")[0].slice(0, 2).toUpperCase();

  if (loading) return <div style={{ padding: 32 }}><p style={{ color: "#666" }}>Loading…</p></div>;
  if (!community) return (
    <div style={{ padding: 32, textAlign: "center" }}>
      <p style={{ color: "#666", marginBottom: 12 }}>Community not found.</p>
      <Link href="/communities" style={{ color: "#0a66c2" }}>Back to communities</Link>
    </div>
  );

  const visibleReferrers = showAllReferrers ? referrers : referrers.slice(0, 5);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Header banner ────────────────────────────── */}
      <div style={{ backgroundColor: "#0a66c2", borderRadius: 8, padding: "28px 28px 20px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "radial-gradient(circle at 70% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
            💬
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>{community.name}</h1>
            {community.description && (
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "0 0 12px", lineHeight: 1.5 }}>{community.description}</p>
            )}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                <strong style={{ color: "#fff" }}>{community.member_count.toLocaleString()}</strong> members
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
                <strong style={{ color: "#fff" }}>{referrers.length}</strong> members can refer you
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {isMember ? (
              <>
                <span style={{ fontSize: 12, fontWeight: 700, backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 16, padding: "7px 14px" }}>✓ Joined</span>
                <button style={{ fontSize: 12, fontWeight: 700, backgroundColor: "#fff", color: "#0a66c2", border: "none", borderRadius: 16, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit" }}>
                  Invite
                </button>
              </>
            ) : (
              <button
                onClick={handleJoin}
                disabled={joining}
                style={{ fontSize: 13, fontWeight: 700, backgroundColor: "#fff", color: "#0a66c2", border: "none", borderRadius: 20, padding: "9px 20px", cursor: joining ? "not-allowed" : "pointer", fontFamily: "inherit" }}
              >
                {joining ? "Joining…" : "+ Join circle"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "flex-start" }}>

        {/* ── Main feed ────────────────────────────────── */}
        <div>
          {/* Referrers section — above the fold */}
          {referrers.length > 0 && (
            <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
                  🤝 Members who can refer you ({referrers.length})
                </p>
              </div>
              <p style={{ fontSize: 12, color: "#666", margin: "0 0 12px" }}>Connect to request a referral at their company</p>

              {visibleReferrers.map((m) => (
                <ReferrerCard
                  key={m.id}
                  member={m}
                  communityId={community.id}
                  requestedIds={requestedIds}
                  onRequestSent={handleReferralRequest}
                />
              ))}

              {referrers.length > 5 && (
                <button
                  onClick={() => setShowAllReferrers((o) => !o)}
                  style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: "#0a66c2", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                >
                  {showAllReferrers ? "Show less" : `Show all ${referrers.length} referrers →`}
                </button>
              )}
            </div>
          )}

          {/* Tabs */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, marginBottom: 12, display: "flex", overflow: "hidden" }}>
            {([["posts", "Posts"], ["members", "Members"], ["jobs", "Jobs"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, padding: "12px 8px", fontSize: 13, fontWeight: tab === key ? 700 : 500,
                  color: tab === key ? "#0a66c2" : "#666",
                  background: "none", border: "none",
                  borderBottom: tab === key ? "2px solid #0a66c2" : "2px solid transparent",
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Posts tab */}
          {tab === "posts" && (
            <>
              {isMember && userId && (
                <PostComposer
                  userId={userId}
                  userInitials={userInitials}
                  communityId={community.id}
                  onPostCreated={handlePostCreated}
                />
              )}
              {posts.length === 0 ? (
                <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: "48px 24px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#666", margin: 0 }}>
                    {isMember ? "Be the first to post in this circle!" : "Join to see posts and participate."}
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} currentUserId={userId} />
                ))
              )}
            </>
          )}

          {/* Members tab */}
          {tab === "members" && (
            <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, overflow: "hidden" }}>
              {members.length === 0 ? (
                <p style={{ padding: "24px", fontSize: 14, color: "#666", textAlign: "center" }}>No members yet.</p>
              ) : (
                members.map((m) => {
                  const name = m.profile?.full_name ?? "Member";
                  const role = m.profile?.current_job_role ?? "";
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f0eeea" }}>
                      <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: avatarColor(m.user_id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                        {initials(name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{name}</span>
                          {m.can_refer && m.employer && (
                            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#dbeafe", color: "#1d4ed8", borderRadius: 4, padding: "1px 6px" }}>
                              Can refer @ {m.employer}
                            </span>
                          )}
                          {m.role !== "member" && (
                            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#f3f2ef", color: "#666", borderRadius: 4, padding: "1px 6px", textTransform: "capitalize" }}>
                              {m.role}
                            </span>
                          )}
                        </div>
                        {role && <p style={{ fontSize: 12, color: "#666", margin: "2px 0 0" }}>{role}</p>}
                        <p style={{ fontSize: 11, color: "#999", margin: "1px 0 0" }}>Joined {timeAgo(m.joined_at)} ago</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Jobs tab */}
          {tab === "jobs" && (
            <div>
              {/* Referral offer posts */}
              {posts.filter((p) => p.type === "referral_offer" || p.type === "job").length === 0 ? (
                <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: "48px 24px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#666", margin: 0 }}>No job posts yet. Members with job openings will post here.</p>
                </div>
              ) : (
                posts
                  .filter((p) => p.type === "referral_offer" || p.type === "job")
                  .map((post) => (
                    <PostCard key={post.id} post={post} currentUserId={userId} />
                  ))
              )}
            </div>
          )}
        </div>

        {/* ── Right sidebar ────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Community info */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>About this circle</p>
            {community.description && (
              <p style={{ fontSize: 13, color: "#555", margin: "0 0 12px", lineHeight: 1.6 }}>{community.description}</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Members</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{community.member_count.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Can refer</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0a66c2" }}>{referrers.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Posts</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{posts.length}</span>
              </div>
            </div>
          </div>

          {/* Back link */}
          <Link
            href="/communities"
            style={{ display: "block", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#0a66c2", textDecoration: "none", backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: "10px" }}
          >
            ← All circles
          </Link>
        </div>
      </div>
    </div>
  );
}
