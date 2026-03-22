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
  role_type: string | null;
  icon_color: string;
  member_count: number;
  posts_this_week: number;
}

/* ─── Helpers ───────────────────────────────────── */
const PALETTE = ["#FDE68A", "#C4B5FD", "#00C9A7", "#FFB5C8", "#B5D5FF", "#FFCBA4", "#B5FFD9", "#FFD9B5"];

function iconColor(c: Community, i: number) {
  return c.icon_color ?? PALETTE[i % PALETTE.length];
}

/* ─── Community Card ────────────────────────────── */
function CommunityCard({ community, index, isMember, onJoin }: {
  community: Community;
  index: number;
  isMember: boolean;
  onJoin: (id: string) => void;
}) {
  const bg = iconColor(community, index);
  const initial = community.name[0]?.toUpperCase() ?? "?";

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ width: 60, height: 60, borderRadius: 14, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#1a1a1a" }}>
        {initial}
      </div>

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>{community.name}</h3>
        {community.role_type && (
          <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#f0f0f0", color: "#888", borderRadius: 99, padding: "3px 10px" }}>{community.role_type}</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <span style={{ fontSize: 12, color: "#888" }}>{community.member_count.toLocaleString()} members</span>
        <span style={{ fontSize: 11, color: "#aaa" }}>{community.posts_this_week} posts this week</span>
      </div>

      {community.description && (
        <p style={{ fontSize: 13, color: "#666", margin: 0, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {community.description}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        {isMember ? (
          <Link href={`/communities/${community.slug}`} style={{ fontSize: 12, fontWeight: 700, backgroundColor: "transparent", color: "#1B3A35", border: "1px solid #1B3A35", borderRadius: 8, padding: "8px 16px", textDecoration: "none" }}>
            View →
          </Link>
        ) : (
          <button
            onClick={() => onJoin(community.id)}
            style={{ fontSize: 12, fontWeight: 700, backgroundColor: "#1B3A35", color: "#00C9A7", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}
          >
            Join
          </button>
        )}
        {isMember && (
          <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#00C9A722", color: "#1B3A35", borderRadius: 99, padding: "4px 10px", alignSelf: "center" }}>Member ✓</span>
        )}
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: comms } = await supabase.from("communities").select("*").order("member_count", { ascending: false });
    setCommunities((comms as Community[]) ?? []);

    if (session?.user.id) {
      const { data: mem } = await supabase.from("community_members").select("community_id").eq("user_id", session.user.id);
      setMemberIds(new Set((mem ?? []).map((m: { community_id: string }) => m.community_id)));
    }
    setLoading(false);
  }, [session?.user.id, supabase]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async (communityId: string) => {
    if (!session?.user.id) return;
    await supabase.from("community_members").upsert({ community_id: communityId, user_id: session.user.id });
    setMemberIds((prev) => { const next = new Set(prev); next.add(communityId); return next; });
  };

  const myComms = communities.filter((c) => memberIds.has(c.id));
  const browseComms = communities.filter((c) => !memberIds.has(c.id));

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>Your circles</h1>
        <p style={{ fontSize: 14, color: "#888", margin: 0 }}>Connect with people at the same stage, in the same role.</p>
      </div>

      {loading ? (
        <p style={{ fontSize: 14, color: "#888" }}>Loading…</p>
      ) : (
        <>
          {/* My communities */}
          {myComms.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 16px" }}>My communities</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {myComms.map((c, i) => (
                  <CommunityCard key={c.id} community={c} index={i} isMember={true} onJoin={handleJoin} />
                ))}
              </div>
            </div>
          )}

          {myComms.length === 0 && (
            <div style={{ backgroundColor: "#fff", border: "1px dashed #eee", borderRadius: 16, padding: "32px 24px", textAlign: "center", marginBottom: 32 }}>
              <p style={{ fontSize: 14, color: "#888", margin: 0 }}>You haven&apos;t joined any communities yet. Join one below.</p>
            </div>
          )}

          {/* Browse */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 16px" }}>Browse communities</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {browseComms.map((c, i) => (
                <CommunityCard key={c.id} community={c} index={i + myComms.length} isMember={false} onJoin={handleJoin} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
