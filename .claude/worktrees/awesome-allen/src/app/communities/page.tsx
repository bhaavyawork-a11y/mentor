"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

/* ─── Types ─────────────────────────────────────── */
interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  member_count: number;
  posts_this_week: number | null;
}

/* ─── Helpers ───────────────────────────────────── */
const COMM_COLORS: Record<string, string> = {
  "founders-office": "#7c3aed",
  "product": "#0a66c2",
  "growth": "#059669",
};
const COMM_EMOJIS: Record<string, string> = {
  "founders-office": "🏢",
  "product": "📋",
  "growth": "📈",
};

function commColor(slug: string) { return COMM_COLORS[slug] ?? "#0a66c2"; }
function commEmoji(slug: string) { return COMM_EMOJIS[slug] ?? "💬"; }

/* ─── Community Card ────────────────────────────── */
function CommunityCard({
  community,
  isMember,
  onJoin,
  onLeave,
  joining,
}: {
  community: Community;
  isMember: boolean;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  joining: boolean;
}) {
  const color = commColor(community.slug);
  const emoji = commEmoji(community.slug);

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* Banner */}
      <div style={{ height: 56, backgroundColor: color }} />

      <div style={{ padding: "0 16px 16px", marginTop: -20 }}>
        {/* Icon */}
        <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: "#fff", border: "2px solid #e0ded8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 8 }}>
          {emoji}
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>{community.name}</h3>

        {community.description && (
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 10px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {community.description}
          </p>
        )}

        {/* Stats */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "#666" }}>
            <strong style={{ color: "#1a1a1a" }}>{community.member_count.toLocaleString()}</strong> members
          </span>
          {community.posts_this_week !== null && community.posts_this_week > 0 && (
            <span style={{ fontSize: 12, color: "#666" }}>
              <strong style={{ color: "#1a1a1a" }}>{community.posts_this_week}</strong> posts/week
            </span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8 }}>
          {isMember ? (
            <>
              <Link
                href={`/communities/${community.slug}`}
                style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, backgroundColor: "#0a66c2", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", textDecoration: "none" }}
              >
                View circle
              </Link>
              <button
                onClick={() => onLeave(community.id)}
                style={{ fontSize: 12, color: "#666", backgroundColor: "#f3f2ef", border: "1px solid #e0ded8", borderRadius: 20, padding: "8px 12px", cursor: "pointer", fontFamily: "inherit" }}
              >
                Leave
              </button>
            </>
          ) : (
            <button
              onClick={() => onJoin(community.id)}
              disabled={joining}
              style={{ flex: 1, fontSize: 13, fontWeight: 700, backgroundColor: joining ? "#ccc" : "#fff", color: "#0a66c2", border: "1.5px solid #0a66c2", borderRadius: 20, padding: "8px 16px", cursor: joining ? "not-allowed" : "pointer", fontFamily: "inherit" }}
            >
              {joining ? "Joining…" : "+ Join"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
export default function CommunitiesPage() {
  const supabase = createClient();
  const { session } = useSession();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const { data: comms } = await supabase
      .from("communities")
      .select("*")
      .order("member_count", { ascending: false });

    setCommunities((comms as Community[]) ?? []);

    if (session?.user.id) {
      const { data: mem } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", session.user.id);
      setMemberIds(new Set((mem ?? []).map((m: { community_id: string }) => m.community_id)));
    }
    setLoading(false);
  }, [session?.user.id, supabase]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async (communityId: string) => {
    if (!session?.user.id) return;
    setJoiningId(communityId);
    await fetch(`/api/communities/${communityId}/join`, { method: "POST" });
    setMemberIds((prev) => { const next = new Set(prev); next.add(communityId); return next; });
    setJoiningId(null);
  };

  const handleLeave = async (communityId: string) => {
    if (!session?.user.id) return;
    await fetch(`/api/communities/${communityId}/leave`, { method: "POST" });
    setMemberIds((prev) => { const next = new Set(prev); next.delete(communityId); return next; });
  };

  const filtered = communities.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const myComms    = filtered.filter((c) => memberIds.has(c.id));
  const browseComms = filtered.filter((c) => !memberIds.has(c.id));

  return (
    <div style={{ display: "flex", gap: 24, maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Left sidebar ────────────────────────────── */}
      <div style={{ width: 225, flexShrink: 0 }}>
        <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #e0ded8" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>My circles</p>
          </div>
          {loading ? (
            <p style={{ padding: "12px 16px", fontSize: 13, color: "#666" }}>Loading…</p>
          ) : myComms.length === 0 ? (
            <p style={{ padding: "12px 16px", fontSize: 13, color: "#666" }}>No circles yet</p>
          ) : (
            myComms.map((c) => (
              <Link
                key={c.id}
                href={`/communities/${c.slug}`}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", textDecoration: "none", borderBottom: "1px solid #f0eeea" }}
              >
                <span style={{ fontSize: 18 }}>{commEmoji(c.slug)}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0 }}>{c.name}</p>
                  <p style={{ fontSize: 11, color: "#666", margin: 0 }}>{c.member_count.toLocaleString()} members</p>
                </div>
              </Link>
            ))
          )}
          <div style={{ padding: "10px 16px" }}>
            <a href="/communities" style={{ fontSize: 13, fontWeight: 600, color: "#0a66c2", textDecoration: "none" }}>Discover circles</a>
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────── */}
      <div style={{ flex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>Communities</h1>
          <p style={{ fontSize: 13, color: "#666", margin: 0 }}>Find your people. Get referrals. Grow together.</p>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search communities…"
          style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e0ded8", borderRadius: 4, padding: "10px 14px", fontSize: 14, fontFamily: "inherit", outline: "none", marginBottom: 20, backgroundColor: "#fff" }}
        />

        {loading ? (
          <p style={{ color: "#666" }}>Loading…</p>
        ) : (
          <>
            {/* Joined */}
            {myComms.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Your circles</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {myComms.map((c) => (
                    <CommunityCard key={c.id} community={c} isMember={true} onJoin={handleJoin} onLeave={handleLeave} joining={joiningId === c.id} />
                  ))}
                </div>
              </div>
            )}

            {/* Browse */}
            {browseComms.length > 0 && (
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Discover</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                  {browseComms.map((c) => (
                    <CommunityCard key={c.id} community={c} isMember={false} onJoin={handleJoin} onLeave={handleLeave} joining={joiningId === c.id} />
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div style={{ backgroundColor: "#fff", border: "1px solid #e0ded8", borderRadius: 8, padding: "48px 24px", textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "#666", margin: 0 }}>No communities match your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
