"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

/* ─── Types ─────────────────────────────────────────────────────── */
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

/* ─── Helpers ───────────────────────────────────────────────────── */
const EMOJI_MAP: Record<string, string> = {
  "SWE":        "💻",
  "Product":    "🧩",
  "Design":     "🎨",
  "Data":       "📊",
  "Finance":    "💰",
  "Marketing":  "📣",
  "Operations": "⚙️",
  "Sales":      "📈",
};

function communityEmoji(community: Community) {
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (community.name.toLowerCase().includes(key.toLowerCase()) ||
        community.role_type?.toLowerCase().includes(key.toLowerCase())) {
      return emoji;
    }
  }
  return community.name[0]?.toUpperCase() ?? "●";
}

/* ─── My Group Card (joined) ────────────────────────────────────── */
function MyGroupCard({ community }: { community: Community }) {
  const icon = communityEmoji(community);
  const isEmoji = icon.length > 1 || icon.codePointAt(0)! > 127;

  return (
    <Link
      href={`/communities/${community.slug}`}
      style={{ textDecoration: "none" }}
    >
      <div style={{
        backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14,
        padding: 16, display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", transition: "all 0.15s",
      }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#0A3323"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(10,51,35,0.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e8e4ce"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
      >
        <div style={{
          width: 46, height: 46, borderRadius: 12, flexShrink: 0,
          backgroundColor: community.icon_color ?? "#F7F4D5",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isEmoji ? 22 : 20, fontWeight: 800, color: "#1a1a1a",
        }}>
          {icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {community.name}
            </p>
            <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: "#83995822", color: "#0A3323", borderRadius: 99, padding: "2px 7px", flexShrink: 0 }}>
              ✓
            </span>
          </div>
          <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>
            {community.member_count.toLocaleString()} members
            {community.posts_this_week > 0 && <span style={{ color: "#b0ab8c" }}> · {community.posts_this_week} active this week</span>}
          </p>
        </div>

        <span style={{ fontSize: 18, color: "#e8e4ce", flexShrink: 0 }}>→</span>
      </div>
    </Link>
  );
}

/* ─── Browse Card (not joined) ──────────────────────────────────── */
function BrowseCard({ community, onJoin }: { community: Community; onJoin: (id: string) => void }) {
  const icon = communityEmoji(community);
  const isEmoji = icon.length > 1 || icon.codePointAt(0)! > 127;

  return (
    <div style={{
      backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 16,
      padding: 20, display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        backgroundColor: community.icon_color ?? "#F7F4D5",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isEmoji ? 24 : 22, fontWeight: 800, color: "#1a1a1a",
      }}>
        {icon}
      </div>

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>{community.name}</h3>
        {community.role_type && (
          <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#e8e4ce", color: "#839958", borderRadius: 99, padding: "3px 10px" }}>
            {community.role_type}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        <span style={{ fontSize: 12, color: "#839958" }}>{community.member_count.toLocaleString()} members</span>
        {community.posts_this_week > 0 && (
          <span style={{ fontSize: 11, color: "#b0ab8c" }}>{community.posts_this_week} posts this week</span>
        )}
      </div>

      {community.description && (
        <p style={{
          fontSize: 13, color: "#666", margin: 0, lineHeight: 1.6,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {community.description}
        </p>
      )}

      <div style={{ marginTop: "auto" }}>
        <button
          onClick={() => onJoin(community.id)}
          style={{
            width: "100%", fontSize: 13, fontWeight: 700,
            backgroundColor: "#0A3323", color: "#839958",
            border: "none", borderRadius: 9, padding: "10px 0",
            cursor: "pointer",
          }}
        >
          Join community
        </button>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
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
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>Your circles</h1>
        <p style={{ fontSize: 14, color: "#839958", margin: 0 }}>
          Connect with people at the same stage, in the same role.
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 14, color: "#839958" }}>Loading…</p>
      ) : (
        <>
          {/* My joined groups */}
          {myComms.length > 0 && (
            <div style={{ marginBottom: 40 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>
                My communities
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myComms.map((c) => <MyGroupCard key={c.id} community={c} />)}
              </div>
            </div>
          )}

          {myComms.length === 0 && (
            <div style={{
              backgroundColor: "#fff", border: "1px dashed #e8e4ce", borderRadius: 16,
              padding: "28px 24px", textAlign: "center", marginBottom: 36,
            }}>
              <p style={{ fontSize: 22, margin: "0 0 8px" }}>👋</p>
              <p style={{ fontSize: 14, color: "#839958", margin: 0 }}>
                You haven&apos;t joined any communities yet — pick one below to get started.
              </p>
            </div>
          )}

          {/* Browse */}
          {browseComms.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 14px" }}>
                Discover communities
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="grid-3">
                {browseComms.map((c) => (
                  <BrowseCard key={c.id} community={c} onJoin={handleJoin} />
                ))}
              </div>
            </div>
          )}

          {browseComms.length === 0 && myComms.length > 0 && (
            <p style={{ fontSize: 13, color: "#b0ab8c", textAlign: "center", marginTop: 20 }}>
              You&apos;re in all available communities 🎉
            </p>
          )}
        </>
      )}
    </div>
  );
}
