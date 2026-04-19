"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

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
  description: string;
  role_type: string;
  icon_color: string;
  member_count: number;
  screening_questions: ScreeningQuestion[];
  requires_verification: boolean;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "12px 14px",
  fontSize: 14, border: "1px solid #1F2937", borderRadius: 10,
  fontFamily: "inherit", outline: "none", backgroundColor: "#0F1117", color: "#F9FAFB",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 88,
  resize: "vertical" as const,
  lineHeight: 1.5,
};

const ROLE_OPTIONS = [
  "Software Engineer", "Product Manager", "Data Analyst / Scientist",
  "Designer (UX/UI)", "Business Analyst", "Consultant", "Finance / Banking",
  "Marketing / Growth", "Sales / BD", "Operations / Strategy",
  "Founder / Entrepreneur", "VC / Investing", "Other",
];

// ─── Step 1: Profile ──────────────────────────────────────────────────────────
function StepProfile({ name, setName, role, setRole }: {
  name: string; setName: (v: string) => void;
  role: string; setRole: (v: string) => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px", lineHeight: 1.6 }}>
        This helps us match you to the right community and personalise your experience.
      </p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>
          What should we call you?
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your full name"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>
          Current or target role
        </label>
        <select
          value={role}
          onChange={e => setRole(e.target.value)}
          style={{ ...inputStyle, appearance: "none" as const, cursor: "pointer" }}
        >
          <option value="">Pick a role…</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Step 2: Pick a group ─────────────────────────────────────────────────────
function StepPickGroup({ communities, chosen, setChosen }: {
  communities: Community[];
  chosen: Community | null;
  setChosen: (c: Community | null) => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 4px", lineHeight: 1.6 }}>
        Each group is verified — you&apos;ll answer 3 quick questions to confirm you belong.
        You can only join <strong style={{ color: "#F9FAFB" }}>one group at signup</strong>. More later.
      </p>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {communities.map(c => {
          const active = chosen?.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setChosen(active ? null : c)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                borderRadius: 12, textAlign: "left", width: "100%",
                border: `1.5px solid ${active ? "#1A3A8F" : "#e8e4ce"}`,
                backgroundColor: active ? "#F0EFD8" : "#fff",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                backgroundColor: c.icon_color || "#FDE68A",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20,
              }}>
                {groupEmoji(c.slug)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: "#F9FAFB", marginBottom: 2 }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.4 }}>
                  {c.member_count.toLocaleString()} members · {c.role_type || c.name}
                </div>
              </div>
              {active && (
                <span style={{
                  width: 20, height: 20, borderRadius: "50%",
                  backgroundColor: "#1A3A8F", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Screening questions ──────────────────────────────────────────────
function StepScreening({ community, answers, setAnswers }: {
  community: Community;
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
}) {
  const questions = community.screening_questions || [];
  const answeredCount = questions.filter(q => (answers[q.id] || "").trim().length >= 30).length;

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
        padding: "12px 14px", borderRadius: 10, backgroundColor: "#F0EFD8",
        border: "1px solid #1F2937",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          backgroundColor: community.icon_color || "#FDE68A",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>
          {groupEmoji(community.slug)}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#F9FAFB" }}>Applying to: {community.name}</div>
          <div style={{ fontSize: 11, color: "#6B7280" }}>AI-reviewed · 1 minute · {answeredCount}/{questions.length} answered</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 16px", lineHeight: 1.5 }}>
        Your answers are reviewed by our AI to verify you&apos;re a fit for this group.
        Be specific — vague answers won&apos;t pass. Each answer should be at least 2-3 sentences.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {questions.map((q, i) => {
          const val = answers[q.id] || "";
          const isLong = val.trim().length >= 30;
          return (
            <div key={q.id}>
              <label style={{
                display: "block", fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6,
                lineHeight: 1.4,
              }}>
                <span style={{ color: "#6B7280", marginRight: 6 }}>Q{i + 1}.</span>
                {q.question}
              </label>
              <textarea
                value={val}
                onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder={q.placeholder || "Be specific — give real examples, numbers, and outcomes…"}
                style={{
                  ...textareaStyle,
                  borderColor: val.trim().length > 0 && !isLong ? "#e8b4a0" : isLong ? "#1A3A8F" : "#e8e4ce",
                }}
              />
              {val.trim().length > 0 && !isLong && (
                <p style={{ fontSize: 11, color: "#FCA5A5", margin: "4px 0 0" }}>
                  Add more detail — short answers are unlikely to pass.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 4: Result ───────────────────────────────────────────────────────────
function StepResult({
  status, score, feedback, community, strengths, areasToImprove, onTryAnother, onEnterGroup
}: {
  status: "approved" | "rejected";
  score: number;
  feedback: string;
  community: Community;
  strengths: string[];
  areasToImprove: string[];
  onTryAnother: () => void;
  onEnterGroup: () => void;
}) {
  const isApproved = status === "approved";

  return (
    <div>
      {/* Result badge */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "24px 0 20px", marginBottom: 20,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%", marginBottom: 12,
          backgroundColor: isApproved ? "#1A3A8F" : "#fef3ee",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
        }}>
          {isApproved ? "✅" : "❌"}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#F9FAFB", margin: "0 0 4px", textAlign: "center" }}>
          {isApproved ? `Welcome to ${community.name}!` : "Not quite yet"}
        </h2>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8,
          padding: "4px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700,
          backgroundColor: isApproved ? "#e6f4ea" : "#fef3ee",
          color: isApproved ? "#1A3A8F" : "#c0714a",
          border: `1.5px solid ${isApproved ? "#1A3A8F" : "#e8b4a0"}`,
        }}>
          AI Score: {score}/100
          <span style={{ fontSize: 10, fontWeight: 400, color: "#6B7280" }}>
            · {isApproved ? "Pass" : "Below threshold (70)"}
          </span>
        </div>
      </div>

      {/* Feedback */}
      <div style={{
        padding: "14px 16px", borderRadius: 12, marginBottom: 16,
        backgroundColor: isApproved ? "#F0EFD8" : "#fef8f5",
        border: `1px solid ${isApproved ? "#e8e4ce" : "#f0cbbf"}`,
      }}>
        <p style={{ fontSize: 13, color: "#F9FAFB", margin: 0, lineHeight: 1.6 }}>
          {feedback}
        </p>
      </div>

      {/* Strengths / improvements */}
      {strengths.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>Strengths noted:</div>
          {strengths.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: "#9CA3AF", paddingLeft: 12, marginBottom: 4, lineHeight: 1.4 }}>
              · {s}
            </div>
          ))}
        </div>
      )}
      {!isApproved && areasToImprove.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#FCA5A5", marginBottom: 6 }}>To strengthen your application:</div>
          {areasToImprove.map((a, i) => (
            <div key={i} style={{ fontSize: 12, color: "#9CA3AF", paddingLeft: 12, marginBottom: 4, lineHeight: 1.4 }}>
              · {a}
            </div>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        {isApproved ? (
          <button
            onClick={onEnterGroup}
            style={{
              width: "100%", padding: "14px", borderRadius: 12, border: "none",
              backgroundColor: "#1A3A8F", color: "#F9FAFB",
              fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Enter {community.name} →
          </button>
        ) : (
          <>
            <button
              onClick={onTryAnother}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                backgroundColor: "#1A3A8F", color: "#F9FAFB",
                fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Try another group
            </button>
            <p style={{ fontSize: 11, color: "#6B7280", textAlign: "center", margin: 0 }}>
              Pick a group that better matches your current experience and try again.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function groupEmoji(slug: string): string {
  const map: Record<string, string> = {
    "product-managers": "📦",
    "early-engineers": "⚙️",
    "founders-office": "🚀",
    "vc-investing": "💹",
    "growth-marketing": "📈",
    "data-ai": "🤖",
    "ops-strategy": "🔧",
    "sales-bd": "🤝",
  };
  return map[slug] ?? "👥";
}

const STEPS = [
  { id: 1, emoji: "👤", title: "About you",          subtitle: "Personalise your Mentor experience"          },
  { id: 2, emoji: "👥", title: "Choose your group",  subtitle: "Pick the community that fits your career"    },
  { id: 3, emoji: "✍️",  title: "Screening",          subtitle: "3 questions to verify you belong"           },
  { id: 4, emoji: "🎯", title: "Application result", subtitle: "Your AI evaluation is ready"                 },
];

// ─── Main page ────────────────────────────────────────────────────────────────
export default function WelcomePage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step, setStep]           = useState(1);
  const [saving, setSaving]       = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [userId, setUserId]       = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  // Step 2
  const [communities, setCommunities]   = useState<Community[]>([]);
  const [chosenGroup, setChosenGroup]   = useState<Community | null>(null);

  // Step 3
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Step 4
  const [evalResult, setEvalResult] = useState<{
    status: "approved" | "rejected";
    score: number;
    feedback: string;
    strengths: string[];
    areas_to_improve: string[];
  } | null>(null);

  // ─── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/"); return; }
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, current_job_role, onboarding_completed")
        .eq("id", session.user.id)
        .single();

      if (profile?.onboarding_completed) { router.replace("/communities"); return; }
      if (profile?.full_name)       setName(profile.full_name);
      if (profile?.current_job_role) setRole(profile.current_job_role);
    });

    // Load communities
    supabase
      .from("communities")
      .select("id, slug, name, description, role_type, icon_color, member_count, screening_questions, requires_verification")
      .order("member_count", { ascending: false })
      .then(({ data }) => {
        if (data) setCommunities(data as Community[]);
      });
  }, [supabase, router]);

  // ─── Reset answers when group changes ───────────────────────────────────
  useEffect(() => {
    setAnswers({});
  }, [chosenGroup?.id]);

  // ─── Step handlers ────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    if (step === 1) {
      // Save profile
      if (!userId || !name.trim()) return;
      setSaving(true);
      await supabase.from("profiles").update({
        full_name: name.trim(),
        current_job_role: role || null,
      }).eq("id", userId);
      setSaving(false);
      setStep(2);

    } else if (step === 2) {
      // Must pick a group
      if (!chosenGroup) return;
      setStep(3);

    } else if (step === 3) {
      // Submit screening answers
      if (!chosenGroup || !userId) return;
      setEvaluating(true);

      try {
        const res = await fetch("/api/groups/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ community_id: chosenGroup.id, answers }),
        });
        const data = await res.json();
        setEvalResult({
          status: data.status,
          score: data.score ?? 0,
          feedback: data.feedback ?? "",
          strengths: data.strengths ?? [],
          areas_to_improve: data.areas_to_improve ?? [],
        });
        setStep(4);
      } catch (err) {
        console.error("Apply error:", err);
      } finally {
        setEvaluating(false);
      }
    }
  }, [step, userId, name, role, chosenGroup, answers, supabase]);

  // ─── Enter group (after approval) ────────────────────────────────────────
  const handleEnterGroup = useCallback(async () => {
    if (!userId || !chosenGroup) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
    router.push(`/communities/${chosenGroup.slug}`);
  }, [userId, chosenGroup, supabase, router]);

  // ─── Try another group ─────────────────────────────────────────────────────
  const handleTryAnother = useCallback(() => {
    setChosenGroup(null);
    setAnswers({});
    setEvalResult(null);
    setStep(2);
  }, []);

  // ─── Can proceed logic ────────────────────────────────────────────────────
  const canProceed = (): boolean => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return chosenGroup !== null;
    if (step === 3) {
      const questions = chosenGroup?.screening_questions ?? [];
      if (questions.length === 0) return true;
      return questions.every(q => (answers[q.id] || "").trim().length >= 20);
    }
    return false;
  };

  const current = STEPS[step - 1];
  const totalSteps = STEPS.length - 1; // Step 4 is result, not a "step" in progress
  const progress = ((step - 1) / totalSteps) * 100;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#1F2937", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#F9FAFB" }}>
            mentor<span style={{ color: "#5B8AFF" }}>.</span>
          </span>
        </div>

        {/* Progress bar */}
        {step < 4 && (
          <>
            <div style={{ backgroundColor: "#1F2937", borderRadius: 99, height: 4, marginBottom: 16, overflow: "hidden" }}>
              <div style={{ height: "100%", backgroundColor: "#1A3A8F", borderRadius: 99, width: `${progress}%`, transition: "width 0.4s ease" }} />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20, justifyContent: "center" }}>
              {[1, 2, 3].map(s => (
                <div key={s} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  backgroundColor: s <= step ? "#1A3A8F" : "#e8e4ce",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
          </>
        )}

        {/* Card */}
        <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid #1F2937" }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{current.emoji}</div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: "#F9FAFB", margin: "0 0 3px" }}>{current.title}</h1>
            <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>{current.subtitle}</p>
          </div>

          {/* Body */}
          <div style={{ padding: "22px 24px", maxHeight: "50vh", overflowY: "auto" }}>
            {step === 1 && (
              <StepProfile name={name} setName={setName} role={role} setRole={setRole} />
            )}
            {step === 2 && (
              <StepPickGroup communities={communities} chosen={chosenGroup} setChosen={setChosenGroup} />
            )}
            {step === 3 && chosenGroup && (
              <StepScreening community={chosenGroup} answers={answers} setAnswers={setAnswers} />
            )}
            {step === 4 && evalResult && chosenGroup && (
              <StepResult
                status={evalResult.status}
                score={evalResult.score}
                feedback={evalResult.feedback}
                community={chosenGroup}
                strengths={evalResult.strengths}
                areasToImprove={evalResult.areas_to_improve}
                onTryAnother={handleTryAnother}
                onEnterGroup={handleEnterGroup}
              />
            )}
          </div>

          {/* Footer — hidden on step 4 (result has its own CTAs) */}
          {step < 4 && (
            <div style={{ padding: "14px 24px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f0ede0" }}>
              {step > 1 ? (
                <button
                  onClick={() => setStep(s => s - 1)}
                  style={{ background: "none", border: "none", fontSize: 13, color: "#6B7280", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                >
                  ← Back
                </button>
              ) : <div />}

              <button
                onClick={handleNext}
                disabled={saving || evaluating || !canProceed()}
                style={{
                  backgroundColor: canProceed() && !saving && !evaluating ? "#1A3A8F" : "#c8c4ae",
                  color: "#F9FAFB", border: "none", borderRadius: 12,
                  padding: "12px 28px", fontSize: 14, fontWeight: 800,
                  cursor: canProceed() && !saving && !evaluating ? "pointer" : "default",
                  fontFamily: "inherit", transition: "background 0.15s",
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {evaluating ? (
                  <>
                    <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                    Evaluating…
                  </>
                ) : saving ? "Saving…" : step === 3 ? "Submit application →" : "Continue →"}
              </button>
            </div>
          )}
        </div>

        {/* Skip link — only on step 2/3 */}
        {step < 3 && (
          <p style={{ textAlign: "center", marginTop: 14 }}>
            <button
              onClick={async () => {
                if (userId) {
                  await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
                }
                router.push("/communities");
              }}
              style={{ background: "none", border: "none", fontSize: 12, color: "#6B7280", cursor: "pointer", fontFamily: "inherit" }}
            >
              Skip setup → explore groups
            </button>
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
