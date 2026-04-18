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
  requires_verification?: boolean;
  screening_questions?: ScreeningQuestion[];
}

interface MemberRecord { community_id: string; status: string; created_at?: string; }
interface AppRecord    { community_id: string; status: string; ai_score: number | null; ai_feedback: string | null; created_at?: string; }

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
  fontSize: 13, border: "1px solid #374151", borderRadius: 8,
  fontFamily: "inherit", outline: "none", backgroundColor: "#0F1117", color: "#F9FAFB",
  minHeight: 72, resize: "vertical" as const, lineHeight: 1.5,
};

// ─── My Group Card ────────────────────────────────────────────────────────────
function MyGroupCard({ community }: { community: Community }) {
  return (
    <Link href={`/communities/${community.slug}`} style={{ textDecoration: "none" }}>
      <div style={{
        backgroundColor: "#181C24", border: "1.5px solid #1F2937", borderRadius: 14,
        padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
        cursor: "pointer", transition: "all 0.15s",
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1A3A8F"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1F2937"; }}
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
            <span style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB" }}>{community.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: "rgba(26,58,143,0.15)", color: "#93B4FF", borderRadius: 99, padding: "2px 8px" }}>
              ✓ Member
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#6B7280" }}>
            {community.member_count.toLocaleString()} members
            {community.posts_this_week > 0 && ` · ${community.posts_this_week} posts this week`}
          </span>
        </div>
        <span style={{ fontSize: 16, color: "#374151", flexShrink: 0 }}>→</span>
      </div>
    </Link>
  );
}

// ─── Pending Card ─────────────────────────────────────────────────────────────
function PendingCard({ community, app }: { community: Community; app: AppRecord }) {
  const rejected = app.status === "rejected";
  const canReapply = rejected && (
    !app.created_at || (Date.now() - new Date(app.created_at).getTime()) >= 7 * 24 * 60 * 60 * 1000
  );
  const daysUntilReapply = rejected && app.created_at
    ? Math.max(0, 7 - Math.floor((Date.now() - new Date(app.created_at).getTime()) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <div style={{
      backgroundColor: rejected ? "rgba(239,68,68,0.07)" : "rgba(245,158,11,0.07)",
      border: `1.5px solid ${rejected ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
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
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB" }}>{community.name}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 8px",
            backgroundColor: rejected ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
            color: rejected ? "#FCA5A5" : "#93B4FF",
          }}>
            {rejected ? "Not approved" : "Under review"}
          </span>
        </div>
        {rejected && app.ai_feedback && (
          <p style={{ fontSize: 11, color: "#FCA5A5", margin: "3px 0 0", lineHeight: 1.4 }}>
            {app.ai_feedback.slice(0, 100)}{app.ai_feedback.length > 100 ? "…" : ""}
          </p>
        )}
        {!rejected && (
          <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>
            Screening completed — reviewing your application
          </p>
        )}
      </div>
      {rejected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          {canReapply ? (
            <Link href={`/communities/${community.slug}/reapply`} style={{
              padding: "7px 14px", borderRadius: 8, border: "none",
              backgroundColor: "#1A3A8F", color: "#F9FAFB",
              fontSize: 12, fontWeight: 700, textDecoration: "none",
              cursor: "pointer", display: "block",
            }}>
              Reapply
            </Link>
          ) : (
            <span style={{ fontSize: 11, color: "#FCA5A5", fontWeight: 600 }}>
              Reapply in {daysUntilReapply} {daysUntilReapply === 1 ? "day" : "days"}
            </span>
          )}
        </div>
      )}
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
      <div style={{ padding: "16px", borderTop: "1px solid #1F2937" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>{ok ? "🎉" : "😔"}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: ok ? "#93B4FF" : "#FCA5A5" }}>
              {ok ? `Welcome to ${community.name}!` : "Application not approved"}
            </div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>AI score: {result.score}/100</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.5, margin: "0 0 12px" }}>
          {result.feedback}
        </p>
        {ok && (
          <Link href={`/communities/${community.slug}`} style={{
            display: "inline-block", padding: "10px 20px", backgroundColor: "#1A3A8F", color: "#F9FAFB",
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
      <div style={{ padding: "20px 16px", borderTop: "1px solid #1F2937", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>Loading screening questions…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", borderTop: "1px solid #1F2937", backgroundColor: "#1F2937" }}>
      <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 14px", lineHeight: 1.5 }}>
        {questions.length > 0
          ? `Answer ${questions.length} short questions. AI evaluates your fit — be specific with real examples.`
          : "Click submit to apply — no screening questions for this group."}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {questions.map((q, i) => {
          const val = answers[q.id] || "";
          return (
            <div key={q.id}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#93B4FF", marginBottom: 5, lineHeight: 1.4 }}>
                Q{i + 1}. {q.question}
              </label>
              <textarea
                value={val}
                onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder={q.placeholder ?? "Be specific — give real examples…"}
                style={{
                  ...textareaStyle,
                  borderColor: val.trim().length > 0 && val.trim().length < 20 ? "rgba(239,68,68,0.5)" : "#374151",
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
            backgroundColor: canSubmit && !submitting ? "#1A3A8F" : "#374151",
            color: "#F9FAFB", fontSize: 13, fontWeight: 700,
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
function DiscoverCard({ community, onApplied, atGroupCap }: {
  community: Community;
  onApplied: (communityId: string, status: "approved" | "rejected") => void;
  atGroupCap: boolean;
}) {
  const [applying, setApplying] = useState(false);

  return (
    <div style={{
      backgroundColor: "#181C24", border: "1.5px solid #1F2937", borderRadius: 16,
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
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#F9FAFB", margin: "0 0 4px" }}>{community.name}</h3>
          {community.role_type && (
            <span style={{ fontSize: 10, fontWeight: 600, backgroundColor: "#1F2937", color: "#6B7280", borderRadius: 99, padding: "2px 8px" }}>
              {community.role_type}
            </span>
          )}
        </div>
      </div>

      {community.description && (
        <p style={{
          fontSize: 12, color: "#9CA3AF", margin: "0 18px 10px", lineHeight: 1.55,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden",
        }}>
          {community.description}
        </p>
      )}

      <div style={{ display: "flex", gap: 16, padding: "0 18px 14px" }}>
        <span style={{ fontSize: 11, color: "#6B7280" }}>{community.member_count.toLocaleString()} members</span>
        {community.posts_this_week > 0 && (
          <span style={{ fontSize: 11, color: "#6B7280" }}>{community.posts_this_week} posts/wk</span>
        )}
        {community.requires_verification && (
          <span style={{ fontSize: 10, color: "#93B4FF", fontWeight: 600 }}>🔒 Verified only</span>
        )}
      </div>

      {/* Channels preview */}
      <div style={{ display: "flex", gap: 6, padding: "0 18px 14px", flexWrap: "wrap" }}>
        {["💬 Discussions", "📚 Library", "🤝 Warm Intros", "💼 Open Roles"].map(ch => (
          <span key={ch} style={{
            fontSize: 10, padding: "3px 8px", borderRadius: 6,
            backgroundColor: "#1F2937", color: "#6B7280", fontWeight: 500,
          }}>
            {ch}
          </span>
        ))}
      </div>

      {/* Apply button / group cap notice */}
      {!applying && (
        <div style={{ padding: "0 18px 18px" }}>
          {atGroupCap ? (
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              backgroundColor: "rgba(180,83,9,0.1)", border: "1px solid rgba(180,83,9,0.3)",
              fontSize: 12, color: "#93B4FF", lineHeight: 1.5,
            }}>
              You&apos;re already in 2 groups. Leave a group before joining another — Mentor limits membership to keep each community focused.
            </div>
          ) : (
            <button
              onClick={() => setApplying(true)}
              style={{
                width: "100%", padding: "11px", borderRadius: 10, border: "1.5px solid #1A3A8F",
                backgroundColor: "transparent", color: "#93B4FF",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              Apply to join →
            </button>
          )}
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

  const [communities, setCommunities]     = useState<Community[]>([]);
  const [memberMap, setMemberMap]         = useState<Map<string, MemberRecord>>(new Map());
  const [appMap, setAppMap]               = useState<Map<string, AppRecord>>(new Map());
  const [loading, setLoading]             = useState(true);
  const [needsReverification, setNeedsReverification] = useState(false);
  const [approvedCount, setApprovedCount] = useState(0);

  const load = useCallback(async () => {
    const { data: comms } = await supabase
      .from("communities")
      .select("id, slug, name, description, role_type, icon_color, member_count, posts_this_week")
      .order("member_count", { ascending: false });

    setCommunities((comms as Community[]) ?? []);

    if (session?.user.id) {
      const [{ data: members }, { data: apps }] = await Promise.all([
        supabase.from("community_members").select("community_id, status, created_at").eq("user_id", session.user.id),
        supabase.from("community_applications").select("community_id, status, ai_score, ai_feedback, created_at").eq("user_id", session.user.id),
      ]);

      const mm = new Map<string, MemberRecord>();
      (members ?? []).forEach((m: MemberRecord) => mm.set(m.community_id, m));
      setMemberMap(mm);

      const approved = (members ?? []).filter((m: MemberRecord) => m.status === "approved");
      setApprovedCount(approved.length);

      const elevenMonthsAgo = Date.now() - 11 * 30 * 24 * 60 * 60 * 1000;
      const needsReverif = approved.some((m: MemberRecord & { created_at?: string }) =>
        m.created_at && new Date(m.created_at).getTime() < elevenMonthsAgo
      );
      setNeedsReverification(needsReverif);

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
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 16px" }}>
        <p style={{ fontSize: 14, color: "#6B7280" }}>Loading groups…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#F9FAFB", margin: "0 0 6px" }}>Groups</h1>
        <p style={{ fontSize: 14, color: "#6B7280", margin: 0 }}>
          Exclusive verified communities for professionals like you. Apply to join, post in channels, get referrals.
        </p>
      </div>

      {/* Re-verification nudge */}
      {needsReverification && (
        <div style={{
          marginBottom: 20, backgroundColor: "rgba(180,83,9,0.1)",
          border: "1px solid rgba(180,83,9,0.35)", borderRadius: 14,
          padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚡</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#93B4FF", margin: "0 0 3px" }}>Keep your profile current</p>
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: "0 0 6px", lineHeight: 1.5 }}>
              It&apos;s been almost a year since you joined Mentor. Update your role and company so your peers know where you are today.
            </p>
            <Link href="/profile" style={{ fontSize: 12, color: "#93B4FF", fontWeight: 700, textDecoration: "underline" }}>
              Update my profile →
            </Link>
          </div>
        </div>
      )}

      {/* My groups */}
      {myGroups.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 12px" }}>
            My Groups ({myGroups.length}/2)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {myGroups.map(c => <MyGroupCard key={c.id} community={c} />)}
          </div>
        </section>
      )}

      {/* Pending */}
      {pendingGroups.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 12px" }}>
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
          backgroundColor: "#181C24", border: "1.5px dashed #1F2937", borderRadius: 16,
          padding: "40px 28px", textAlign: "center", marginBottom: 32,
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB", margin: "0 0 12px", lineHeight: 1.5 }}>
            You haven&apos;t joined a group yet. Apply to a verified group to access discussions, job postings, and peers in your role.
          </p>
          <a href="#discover-section" style={{ fontSize: 13, fontWeight: 700, color: "#93B4FF", textDecoration: "none", cursor: "pointer" }}>
            Apply to a group →
          </a>
        </div>
      )}

      {/* Discover */}
      {discoverGroups.length > 0 && (
        <section id="discover-section">
          <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 12px" }}>
            Discover Groups — Apply to Join
          </p>
          <div className="communities-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
            {discoverGroups.map(c => (
              <DiscoverCard key={c.id} community={c} onApplied={handleApplied} atGroupCap={approvedCount >= 2} />
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
