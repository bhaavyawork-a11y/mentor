"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScreeningQuestion {
  id: string;
  question: string;
  placeholder?: string;
}

interface Community {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  role_type: string | null;
  icon_color: string;
  member_count: number;
  posts_this_week: number;
  // Fetched on-demand in ApplyPanel (not in list query — safe before migration 014)
  requires_verification?: boolean;
  screening_questions?: ScreeningQuestion[];
}

interface MemberRecord { community_id: string; status: string; }
interface AppRecord    { community_id: string; status: string; ai_score: number | null; ai_feedback: string | null; }

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

const textareaStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px",
  fontSize: 13, border: "1px solid #e8e4ce", borderRadius: 8,
  fontFamily: "inherit", outline: "none", backgroundColor: "#fff", color: "#1a1a1a",
  minHeight: 72, resize: "vertical" as const, lineHeight: 1.5,
};

// ─── My Group Card ────────────────────────────────────────────────────────────
function MyGroupCard({ community }: { community: Community }) {
  return (
    <Link href={`/communities/${community.slug}`} style={{ textDecoration: "none" }}>
      <div style={{
        backgroundColor: "#fff", border: "1.5px solid #e8e4ce", borderRadius: 14,
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", transition: "all 0.15s",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#0A3323"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#e8e4ce"; }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          backgroundColor: community.icon_color ?? "#FDE68A",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
        }}>
          {groupEmoji(community.slug)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 1 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>{community.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: "#e6f4ea", color: "#0A3323", borderRadius: 99, padding: "2px 8px" }}>
              ✓ Member
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#839958" }}>
            {community.member_count.toLocaleString()} members
            {community.posts_this_week > 0 && ` · ${community.posts_this_week} posts this week`}
          </span>
        </div>
        <span style={{ fontSize: 16, color: "#c8c4ae", flexShrink: 0 }}>→</span>
      </div>
    </Link>
  );
}

// ─── Pending Card ─────────────────────────────────────────────────────────────
function PendingCard({ community, app }: { community: Community; app: AppRecord }) {
  const rejected = app.status === "rejected";
  return (
    <div style={{
      backgroundColor: rejected ? "#fff8f5" : "#fffdf0",
      border: `1.5px solid ${rejected ? "#f0cbbf" : "#e8e4ce"}`,
      borderRadius: 14, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        backgroundColor: community.icon_color ?? "#FDE68A",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
        opacity: 0.7,
      }}>
        {groupEmoji(community.slug)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{community.name}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 8px",
            backgroundColor: rejected ? "#fef3ee" : "#fffbea",
            color: rejected ? "#c0714a" : "#9a7d00",
          }}>
            {rejected ? "Not approved" : "Under review"}
          </span>
        </div>
        {rejected && app.ai_feedback && (
          <p style={{ fontSize: 11, color: "#c0714a", margin: "3px 0 0", lineHeight: 1.4 }}>
            {app.ai_feedback.slice(0, 100)}{app.ai_feedback.length > 100 ? "…" : ""}
          </p>
        )}
        {!rejected && (
          <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>
            Screening completed — reviewing your application
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Apply Panel (inline screening flow) ─────────────────────────────────────
function ApplyPanel({ community, onDone }: {
  community: Community;
  onDone: (result: { status: "approved" | "rejected"; score: number; feedback: string }) => void;
}) {
  const supabase = createClient();
  const [answers, setAnswers]       = useState<Record<string, string>>({});
  const [submitting, setSubmitting]   = useState(false);
  const [loadingQs, setLoadingQs]     = useState(true);
  const [questions, setQuestions]     = useState<ScreeningQuestion[]>([]);
  const [result, setResult]           = useState<{
    status: "approved" | "rejected"; score: number; feedback: string;
  } | null>(null);

  // Fetch screening questions on-demand (avoids breaking the list query
  // before migration 014 is applied)
  useEffect(() => {
    const fetchQs = async () => {
      try {
        const { data } = await supabase
          .from("communities")
          .select("screening_questions, requires_verification")
          .eq("id", community.id)
          .single();
        const qs = (data as { screening_questions?: ScreeningQuestion[] } | null)?.screening_questions ?? [];
        setQuestions(qs);
      } catch {
        // columns may not exist yet — no-op
      } finally {
        setLoadingQs(false);
      }
    };
    fetchQs();
  }, [community.id, supabase]);

  const canSubmit = !loadingQs && questions.every(q => (answers[q.id] || "").trim().length >= 20);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/groups/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community_id: community.id, answers }),
      });
      const data = await res.json();
      const r = { status: data.status, score: data.score ?? 0, feedback: data.feedback ?? "" };
      setResult(r);
      onDone(r);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const ok = result.status === "approved";
    return (
      <div style={{ padding: "16px", borderTop: "1px solid #e8e4ce" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>{ok ? "🎉" : "😔"}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: ok ? "#0A3323" : "#c0714a" }}>
              {ok ? `Welcome to ${community.name}!` : "Application not approved"}
            </div>
            <div style={{ fontSize: 11, color: "#839958" }}>AI score: {result.score}/100</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#555", lineHeight: 1.5, margin: "0 0 12px" }}>
          {result.feedback}
        </p>
        {ok && (
          <Link href={`/communities/${community.slug}`} style={{
            display: "inline-block", padding: "10px 20px", backgroundColor: "#0A3323", color: "#F7F4D5",
            borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>
            Enter group →
          </Link>
        )}
      </div>
    );
  }

  if (loadingQs) {
    return (
      <div style={{ padding: "20px 16px", borderTop: "1px solid #e8e4ce", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>Loading screening questions…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", borderTop: "1px solid #e8e4ce", backgroundColor: "#fafaf4" }}>
      <p style={{ fontSize: 12, color: "#839958", margin: "0 0 14px", lineHeight: 1.5 }}>
        {questions.length > 0
          ? `Answer ${questions.length} short questions. AI evaluates your fit — be specific with real examples.`
          : "Click submit to apply — no screening questions for this group."}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {questions.map((q, i) => {
          const val = answers[q.id] || "";
          return (
            <div key={q.id}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#0A3323", marginBottom: 5, lineHeight: 1.4 }}>
                Q{i + 1}. {q.question}
              </label>
              <textarea
                value={val}
                onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder={q.placeholder ?? "Be specific — give real examples…"}
                style={{
                  ...textareaStyle,
                  borderColor: val.trim().length > 0 && val.trim().length < 20 ? "#e8b4a0" : "#e8e4ce",
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{
            padding: "10px 22px", borderRadius: 10, border: "none",
            backgroundColor: canSubmit && !submitting ? "#0A3323" : "#c8c4ae",
            color: "#F7F4D5", fontSize: 13, fontWeight: 700,
            cursor: canSubmit && !submitting ? "pointer" : "default",
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {submitting ? (
            <>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
              Evaluating…
            </>
          ) : "Submit application →"}
        </button>
      </div>
    </div>
  );
}

// ─── Discover Card ────────────────────────────────────────────────────────────
function DiscoverCard({ community, onApplied }: {
  community: Community;
  onApplied: (communityId: string, status: "approved" | "rejected") => void;
}) {
  const [applying, setApplying] = useState(false);

  return (
    <div style={{
      backgroundColor: "#fff", border: "1.5px solid #e8e4ce", borderRadius: 16,
      overflow: "hidden", transition: "border-color 0.15s",
    }}>
      {/* Card header */}
      <div style={{ padding: "18px 18px 14px", display: "flex", gap: 14 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          backgroundColor: community.icon_color ?? "#FDE68A",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
        }}>
          {groupEmoji(community.slug)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>{community.name}</h3>
          {community.role_type && (
            <span style={{ fontSize: 10, fontWeight: 600, backgroundColor: "#f0ede0", color: "#839958", borderRadius: 99, padding: "2px 8px" }}>
              {community.role_type}
            </span>
          )}
        </div>
      </div>

      {community.description && (
        <p style={{
          fontSize: 12, color: "#666", margin: "0 18px 10px", lineHeight: 1.55,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden",
        }}>
          {community.description}
        </p>
      )}

      <div style={{ display: "flex", gap: 16, padding: "0 18px 14px" }}>
        <span style={{ fontSize: 11, color: "#839958" }}>{community.member_count.toLocaleString()} members</span>
        {community.posts_this_week > 0 && (
          <span style={{ fontSize: 11, color: "#b0ab8c" }}>{community.posts_this_week} posts/wk</span>
        )}
        {community.requires_verification && (
          <span style={{ fontSize: 10, color: "#0A3323", fontWeight: 600 }}>🔒 Verified only</span>
        )}
      </div>

      {/* Channels preview */}
      <div style={{ display: "flex", gap: 6, padding: "0 18px 14px", flexWrap: "wrap" }}>
        {["💬 Discussions", "📚 Upskilling", "🤝 Referrals", "💼 Job Board"].map(ch => (
          <span key={ch} style={{
            fontSize: 10, padding: "3px 8px", borderRadius: 6,
            backgroundColor: "#f5f3ea", color: "#839958", fontWeight: 500,
          }}>
            {ch}
          </span>
        ))}
      </div>

      {/* Apply button */}
      {!applying && (
        <div style={{ padding: "0 18px 18px" }}>
          <button
            onClick={() => setApplying(true)}
            style={{
              width: "100%", padding: "11px", borderRadius: 10, border: "1.5px solid #0A3323",
              backgroundColor: "transparent", color: "#0A3323",
              fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Apply to join →
          </button>
        </div>
      )}

      {/* Inline screening panel */}
      {applying && (
        <ApplyPanel
          community={community}
          onDone={r => {
            onApplied(community.id, r.status);
          }}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CommunitiesPage() {
  const supabase = createClient();
  const { session } = useSession();

  const [communities, setCommunities]   = useState<Community[]>([]);
  const [memberMap, setMemberMap]       = useState<Map<string, MemberRecord>>(new Map());
  const [appMap, setAppMap]             = useState<Map<string, AppRecord>>(new Map());
  const [loading, setLoading]           = useState(true);

  const load = useCallback(async () => {
    // Select only stable columns — new columns (requires_verification, screening_questions)
    // are fetched on-demand in the ApplyPanel to avoid breaking before migration 014 runs
    const { data: comms } = await supabase
      .from("communities")
      .select("id, slug, name, description, role_type, icon_color, member_count, posts_this_week")
      .order("member_count", { ascending: false });

    setCommunities((comms as Community[]) ?? []);

    if (session?.user.id) {
      const [{ data: members }, { data: apps }] = await Promise.all([
        supabase.from("community_members").select("community_id, status").eq("user_id", session.user.id),
        supabase.from("community_applications").select("community_id, status, ai_score, ai_feedback").eq("user_id", session.user.id),
      ]);

      const mm = new Map<string, MemberRecord>();
      (members ?? []).forEach((m: MemberRecord) => mm.set(m.community_id, m));
      setMemberMap(mm);

      const am = new Map<string, AppRecord>();
      (apps ?? []).forEach((a: AppRecord) => am.set(a.community_id, a));
      setAppMap(am);
    }
    setLoading(false);
  }, [session?.user.id, supabase]);

  useEffect(() => { load(); }, [load]);

  const handleApplied = (communityId: string, status: "approved" | "rejected") => {
    if (status === "approved") {
      setMemberMap(prev => {
        const next = new Map(prev);
        next.set(communityId, { community_id: communityId, status: "approved" });
        return next;
      });
      setAppMap(prev => {
        const next = new Map(prev);
        next.set(communityId, { community_id: communityId, status: "approved", ai_score: null, ai_feedback: null });
        return next;
      });
    } else {
      setAppMap(prev => {
        const next = new Map(prev);
        next.set(communityId, { community_id: communityId, status: "rejected", ai_score: null, ai_feedback: "Application not approved" });
        return next;
      });
    }
  };

  const myGroups      = communities.filter(c => memberMap.get(c.id)?.status === "approved");
  const pendingGroups = communities.filter(c => {
    const app = appMap.get(c.id);
    return app && app.status !== "approved" && !memberMap.has(c.id);
  });
  const discoverGroups = communities.filter(c =>
    !memberMap.has(c.id) &&
    (!appMap.has(c.id) || appMap.get(c.id)?.status === "rejected")
  );

  if (loading) {
    return (
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 0" }}>
        <p style={{ fontSize: 14, color: "#839958" }}>Loading groups…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 0 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>Groups</h1>
        <p style={{ fontSize: 14, color: "#839958", margin: 0 }}>
          Exclusive verified communities for professionals like you. Apply to join, post in channels, get referrals.
        </p>
      </div>

      {/* My groups */}
      {myGroups.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 12px" }}>
            My Groups ({myGroups.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myGroups.map(c => <MyGroupCard key={c.id} community={c} />)}
          </div>
        </section>
      )}

      {/* Pending */}
      {pendingGroups.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 12px" }}>
            Applications
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingGroups.map(c => (
              <PendingCard key={c.id} community={c} app={appMap.get(c.id)!} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state — no groups yet */}
      {myGroups.length === 0 && pendingGroups.length === 0 && (
        <div style={{
          backgroundColor: "#fff", border: "1.5px dashed #e8e4ce", borderRadius: 16,
          padding: "40px 28px", textAlign: "center", marginBottom: 32,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 12px", lineHeight: 1.5 }}>
            You haven't joined a group yet. Apply to a verified group to access discussions, job postings, and peers in your role.
          </p>
          <a href="#discover-section" style={{ fontSize: 13, fontWeight: 700, color: "#0A3323", textDecoration: "none", cursor: "pointer" }}>
            Apply to a group →
          </a>
        </div>
      )}

      {/* Discover */}
      {discoverGroups.length > 0 && (
        <section id="discover-section">
          <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 12px" }}>
            Discover Groups — Apply to Join
          </p>
          <div className="communities-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {discoverGroups.map(c => (
              <DiscoverCard key={c.id} community={c} onApplied={handleApplied} />
            ))}
          </div>
        </section>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 767px) {
          .communities-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
