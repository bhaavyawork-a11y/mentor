"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import PostCard from "./PostCard";
import PostComposer, { type FeedPost } from "./PostComposer";

interface FeedClientProps {
  initialPosts: FeedPost[];
  currentUserId: string;
  userInitials: string;
  joinedCommunityIds: string[];
  followedUserIds: string[];
  suggestions: Array<{ id: string; full_name: string | null; current_job_role: string | null }>;
  myCommunities: Array<{ id: string; name: string; slug: string; member_count: number }>;
}

type Tab = "all" | "circles" | "following";

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

export default function FeedClient({
  initialPosts,
  currentUserId,
  userInitials,
  joinedCommunityIds,
  followedUserIds,
  suggestions,
  myCommunities,
}: FeedClientProps) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [tab, setTab] = useState<Tab>("all");
  const [offset, setOffset] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPosts.length === 20);
  const [newPostBanner, setNewPostBanner] = useState(false);
  const [pendingPosts, setPendingPosts] = useState<FeedPost[]>([]);
  const [followState, setFollowState] = useState<Record<string, boolean>>({});

  const supabase = createClient();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("public:posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        const newPost = payload.new as FeedPost;
        if (newPost.author_id !== currentUserId) {
          setPendingPosts((prev) => [newPost, ...prev]);
          setNewPostBanner(true);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, currentUserId]);

  const handleShowNewPosts = () => {
    setPosts((prev) => [...pendingPosts, ...prev]);
    setPendingPosts([]);
    setNewPostBanner(false);
  };

  const handlePostCreated = (post: FeedPost) => {
    setPosts((prev) => [post, ...prev]);
  };

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const res = await fetch(`/api/posts/list?offset=${offset}&limit=20`);
    if (res.ok) {
      const { posts: more } = await res.json() as { posts: FeedPost[] };
      setPosts((prev) => [...prev, ...more]);
      setOffset((o) => o + 20);
      setHasMore(more.length === 20);
    }
    setLoadingMore(false);
  }, [offset]);

  const toggleFollow = async (targetId: string) => {
    const res = await fetch("/api/follows/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_id: targetId }),
    });
    if (res.ok) {
      const { following } = await res.json() as { following: boolean };
      setFollowState((s) => ({ ...s, [targetId]: following }));
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (tab === "circles") return p.community_id && joinedCommunityIds.includes(p.community_id);
    if (tab === "following") return followedUserIds.includes(p.author_id);
    return true;
  });

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", maxWidth: 1128, margin: "0 auto" }}>

      {/* ── Left sidebar (225px) ────────────────────────────────────────── */}
      <div style={{ width: 225, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>

        {/* Profile card */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: 56, backgroundColor: "#0a66c2" }} />
          <div style={{ padding: "0 16px 16px", marginTop: -24 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: avatarColor(currentUserId), border: "3px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>
              {userInitials}
            </div>
            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px" }}>Your Profile</p>
            </div>
            <div style={{ height: 1, backgroundColor: "#e0ded8", margin: "12px 0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#666" }}>Circles joined</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0a66c2" }}>{joinedCommunityIds.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#666" }}>Following</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0a66c2" }}>{followedUserIds.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: "12px 0" }}>
          {[
            { href: "/feed", label: "Feed" },
            { href: "/communities", label: "My Circles" },
            { href: "/jobs", label: "Jobs for you" },
            { href: "/refer", label: "Referrals" },
            { href: "/profile", label: "Edit profile" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              style={{ display: "block", padding: "7px 16px", fontSize: 13, fontWeight: 500, color: "#333", textDecoration: "none", transition: "background 0.1s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#f3f2ef"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent"; }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Center feed ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* New post banner */}
        {newPostBanner && (
          <button
            onClick={handleShowNewPosts}
            style={{
              display: "block", width: "100%", marginBottom: 8,
              backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8,
              padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#0a66c2",
              cursor: "pointer", textAlign: "center", fontFamily: "inherit",
            }}
          >
            {pendingPosts.length} new post{pendingPosts.length !== 1 ? "s" : ""} — click to load
          </button>
        )}

        {/* Composer */}
        <PostComposer userId={currentUserId} userInitials={userInitials} onPostCreated={handlePostCreated} />

        {/* Tabs */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, marginBottom: 8, display: "flex", overflow: "hidden" }}>
          {([["all", "All"], ["circles", "My circles"], ["following", "Following"]] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                flex: 1, padding: "12px 8px", fontSize: 13, fontWeight: tab === key ? 700 : 500,
                color: tab === key ? "#0a66c2" : "#666",
                background: "none", border: "none",
                borderBottom: tab === key ? "2px solid #0a66c2" : "2px solid transparent",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.1s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Posts */}
        {filteredPosts.length === 0 ? (
          <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: "48px 24px", textAlign: "center" }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a", margin: "0 0 8px" }}>
              {tab === "circles" ? "No posts from your circles yet" : tab === "following" ? "No posts from people you follow" : "No posts yet"}
            </p>
            <p style={{ fontSize: 14, color: "#666", margin: 0 }}>
              {tab === "circles" ? "Join a circle to see posts here." : tab === "following" ? "Follow people to see their posts here." : "Be the first to post!"}
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))
        )}

        {/* Load more */}
        {tab === "all" && hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            style={{ width: "100%", marginTop: 8, padding: "12px", fontSize: 13, fontWeight: 600, color: "#0a66c2", backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, cursor: loadingMore ? "not-allowed" : "pointer", fontFamily: "inherit" }}
          >
            {loadingMore ? "Loading…" : "Show more posts"}
          </button>
        )}
      </div>

      {/* ── Right sidebar (300px) ────────────────────────────────────────── */}
      <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>

        {/* My groups */}
        {myCommunities.length > 0 && (
          <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: "16px" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>My circles</p>
            {myCommunities.slice(0, 5).map((c) => (
              <a
                key={c.id}
                href={`/communities/${c.slug}`}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", textDecoration: "none", borderBottom: "1px solid #f0eeea" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: avatarColor(c.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {c.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                  <p style={{ fontSize: 11, color: "#666", margin: 0 }}>{c.member_count.toLocaleString()} members</p>
                </div>
              </a>
            ))}
            <a href="/communities" style={{ display: "block", marginTop: 8, fontSize: 12, fontWeight: 600, color: "#0a66c2", textDecoration: "none" }}>Discover more circles →</a>
          </div>
        )}

        {/* People to follow */}
        {suggestions.length > 0 && (
          <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: "16px" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>People to follow</p>
            {suggestions.map((s) => {
              const isFollowing = followState[s.id] ?? false;
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0eeea" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: avatarColor(s.id), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {initials(s.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>{s.full_name ?? "Member"}</p>
                    {s.current_job_role && <p style={{ fontSize: 11, color: "#666", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.current_job_role}</p>}
                  </div>
                  <button
                    onClick={() => toggleFollow(s.id)}
                    style={{ fontSize: 12, fontWeight: 700, backgroundColor: isFollowing ? "#f3f2ef" : "#fff", color: isFollowing ? "#666" : "#0a66c2", border: "1px solid " + (isFollowing ? "#e0ded8" : "#0a66c2"), borderRadius: 16, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                  >
                    {isFollowing ? "Following" : "+ Follow"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Trending tags */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: "16px" }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px" }}>Trending topics</p>
          {["referral", "hiring", "productmanagement", "chiefofstaff", "growth", "interview"].map((tag) => (
            <div key={tag} style={{ padding: "6px 0", borderBottom: "1px solid #f0eeea" }}>
              <p style={{ fontSize: 13, color: "#0a66c2", margin: 0, fontWeight: 500 }}>#{tag}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
