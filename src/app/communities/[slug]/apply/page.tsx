"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

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
  icon_color: string | null;
  member_count: number;
  screening_questions: ScreeningQuestion[];
  requires_verification: boolean;
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 3, flex: 1, borderRadius: 99,
          backgroundColor: i < current ? "#1A3A8F" : i === current ? "#5B8AFF" : "#E5E7EB",
          transition: "background 0.3s",
        }} />
      ))}
    </div>
  );
}

// ─── Group emoji helper ───────────────────────────────────────────────────────
function groupEmoji(slug: string) {
  const map: Record<string, string> = {
    "founders-office": "🏢", "product": "📱", "growth-marketing": "📈",
    "engineering": "⚙️", "design": "🎨", "finance": "💹", "sales": "🤝",
    "operations": "⚡", "data": "📊", "hr": "👥",
  };
  for (const key of Object.keys(map)) {
    if (slug.includes(key.replace("-", ""))) return map[key];
  }
  return "🏘️";
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ApplyPage() {
  const params   = useParams();
  const router   = useRouter();
  const slug     = params?.slug as string;
  const supabase = createClient();
  const { session } = useSession();

  const [community, setCommunity] = useState<Community | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [answers,   setAnswers]   = useState<Record<string, string>>({});
  const [step,      setStep]      = useState<"questions" | "screening" | "result">("questions");
  const [result,    setResult]    = useState<{
    status: "approved" | "rejected"; score: number; feedback: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [screeningMsg, setScreeningMsg] = useState("Reading your answers…");
  const [alreadyMember, setAlreadyMember] = useState(false);

  // Rotating screening messages
  useEffect(() => {
    if (step !== "screening") return;
    const msgs = [
      "Reading your answers…",
      "Checking your background…",
      "Evaluating fit with the community…",
      "Scoring your responses…",
      "Almost there…",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length;
      setScreeningMsg(msgs[i]);
    }, 1800);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (!slug) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("communities")
        .select("id, slug, name, description, role_type, icon_color, member_count, screening_questions, requires_verification")
        .eq("slug", slug)
        .single();
      setCommunity(data as Community | null);

      // Check membership
      if (session?.user?.id && data) {
        const { data: mem } = await supabase
          .from("community_members")
          .select("status")
          .eq("community_id", (data as Community).id)
          .eq("user_id", session.user.id)
          .single();
        if ((mem as { status: string } | null)?.status === "approved") setAlreadyMember(true);
      }
      setLoading(false);
    };
    fetch();
  }, [slug, session, supabase]);

  const questions = community?.screening_questions ?? [];
  const totalSteps = questions.length || 1;
  const [currentQ, setCurrentQ] = useState(0);

  const currentAnswer = answers[questions[currentQ]?.id ?? ""] ?? "";
  const isAnswered = currentAnswer.trim().length >= 15;
  const isLastQ = currentQ === questions.length - 1;

  const handleSubmit = async () => {
    setStep("screening");
    setSubmitting(true);
    try {
      const res = await fetch("/api/groups/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community_id: community!.id, answers }),
      });
      const data = await res.json();
      setResult({ status: data.status, score: data.score ?? 0, feedback: data.feedback ?? "" });
      setStep("result");
    } catch {
      setResult({ status: "rejected", score: 0, feedback: "Something went wrong. Please try again." });
      setStep("result");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E5E7EB", borderTopColor: "#1A3A8F", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!community) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 16, color: "#111827", fontWeight: 700 }}>Group not found</p>
        <Link href="/communities" style={{ fontSize: 14, color: "#1A3A8F", textDecoration: "none" }}>← Back to groups</Link>
      </div>
    );
  }

  if (alreadyMember) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, padding: 32 }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>You&apos;re already a member</h2>
        <Link href={`/communities/${slug}`} style={{
          backgroundColor: "#1A3A8F", color: "#fff", padding: "12px 24px",
          borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: "none",
        }}>
          Enter group →
        </Link>
      </div>
    );
  }

  // ── AI Screening ──
  if (step === "screening") {
    return (
      <div style={{
        minHeight: "100dvh", backgroundColor: "#080B14",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "32px 24px", textAlign: "center",
      }}>
        {/* Animated ring */}
        <div style={{ position: "relative", width: 80, height: 80, marginBottom: 28 }}>
          <div style={{
            position: "absolute", inset: 0,
            borderRadius: "50%", border: "3px solid rgba(91,138,255,0.15)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            borderRadius: "50%", border: "3px solid transparent",
            borderTopColor: "#5B8AFF",
            animation: "spin 1s linear infinite",
          }} />
          <div style={{
            position: "absolute", inset: 8,
            borderRadius: "50%", border: "2px solid rgba(91,138,255,0.1)",
            borderTopColor: "#93B4FF",
            animation: "spin 1.5s linear infinite reverse",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24,
          }}>
            🤖
          </div>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#F9FAFB", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
          AI Screening
        </h2>
        <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 32px", lineHeight: 1.6 }}>
          {screeningMsg}
        </p>

        <div style={{
          backgroundColor: "#141720", border: "1px solid #1C2030",
          borderRadius: 14, padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 12, maxWidth: 300, width: "100%",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            backgroundColor: community.icon_color ?? "#1A3A8F",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>
            {groupEmoji(community.slug)}
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB" }}>{community.name}</div>
            <div style={{ fontSize: 11, color: "#6B7280" }}>{community.member_count.toLocaleString()} members</div>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Result ──
  if (step === "result" && result) {
    const ok = result.status === "approved";
    return (
      <div style={{
        minHeight: "100dvh", backgroundColor: ok ? "#F9FAFB" : "#080B14",
        display: "flex", flexDirection: "column",
      }}>
        {/* Back nav */}
        <div style={{ padding: "20px 24px" }}>
          <Link href="/communities" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: ok ? "#F3F4F6" : "rgba(255,255,255,0.08)",
            textDecoration: "none", fontSize: 18,
            color: ok ? "#374151" : "#9CA3AF",
          }}>
            ←
          </Link>
        </div>

        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "0 24px 48px", textAlign: "center",
        }}>
          {/* Status icon */}
          <div style={{
            width: 80, height: 80, borderRadius: "50%", marginBottom: 24,
            backgroundColor: ok ? "rgba(26,58,143,0.1)" : "rgba(239,68,68,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 38,
          }}>
            {ok ? "🎉" : "😔"}
          </div>

          <h1 style={{
            fontSize: 26, fontWeight: 900, margin: "0 0 8px",
            color: ok ? "#111827" : "#F9FAFB",
            letterSpacing: "-0.6px",
          }}>
            {ok ? `You're in!` : "Not this time."}
          </h1>

          <p style={{
            fontSize: 13, color: ok ? "#6B7280" : "#9CA3AF",
            margin: "0 0 8px",
          }}>
            AI score: <strong style={{ color: ok ? "#1A3A8F" : "#93B4FF" }}>{result.score}/100</strong>
          </p>

          {/* Feedback card */}
          <div style={{
            maxWidth: 360, width: "100%",
            backgroundColor: ok ? "#fff" : "#141720",
            border: `1px solid ${ok ? "#E5E7EB" : "#1C2030"}`,
            borderRadius: 16, padding: "20px 20px",
            margin: "16px 0 28px", textAlign: "left",
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 8px" }}>
              AI Feedback
            </p>
            <p style={{ fontSize: 13, color: ok ? "#374151" : "#9CA3AF", margin: 0, lineHeight: 1.7 }}>
              {result.feedback}
            </p>
          </div>

          {/* Community pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            backgroundColor: ok ? "#F3F4F6" : "#141720",
            border: `1px solid ${ok ? "#E5E7EB" : "#1C2030"}`,
            borderRadius: 12, padding: "10px 16px",
            marginBottom: 28,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              backgroundColor: community.icon_color ?? "#1A3A8F",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>
              {groupEmoji(community.slug)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: ok ? "#111827" : "#F9FAFB" }}>
              {community.name}
            </span>
          </div>

          {/* CTA */}
          {ok ? (
            <Link href={`/communities/${community.slug}`} style={{
              display: "block", width: "100%", maxWidth: 360,
              backgroundColor: "#1A3A8F", color: "#fff",
              padding: "14px", borderRadius: 14, fontSize: 15,
              fontWeight: 800, textDecoration: "none", textAlign: "center",
              letterSpacing: "-0.2px",
            }}>
              Enter {community.name} →
            </Link>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 360 }}>
              <Link href="/communities" style={{
                display: "block", backgroundColor: "#1A3A8F", color: "#fff",
                padding: "14px", borderRadius: 14, fontSize: 15,
                fontWeight: 800, textDecoration: "none", textAlign: "center",
              }}>
                Explore other groups →
              </Link>
              <Link href="/communities" style={{
                display: "block", backgroundColor: "transparent",
                border: "1px solid #1C2030", color: "#9CA3AF",
                padding: "12px", borderRadius: 14, fontSize: 13,
                fontWeight: 600, textDecoration: "none", textAlign: "center",
              }}>
                Try again in 30 days
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Questions ──
  const q = questions[currentQ];
  const hasQuestions = questions.length > 0;

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#F9FAFB", display: "flex", flexDirection: "column" }}>

      {/* ── Top bar ── */}
      <div style={{ padding: "20px 24px 0" }}>
        <Link href={`/communities`} style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: "#F3F4F6", textDecoration: "none",
          fontSize: 18, color: "#374151",
        }}>
          ←
        </Link>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: "24px 24px 48px", maxWidth: 420, width: "100%", margin: "0 auto" }}>

        {/* Community badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          backgroundColor: "#F3F4F6", borderRadius: 99, padding: "6px 12px",
          marginBottom: 20,
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 6,
            backgroundColor: community.icon_color ?? "#1A3A8F",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
          }}>
            {groupEmoji(community.slug)}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{community.name}</span>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 28, fontWeight: 900, color: "#111827",
          margin: "0 0 6px", letterSpacing: "-0.7px", lineHeight: 1.1,
        }}>
          Apply to join.
        </h1>
        <p style={{ fontSize: 14, color: "#9CA3AF", margin: "0 0 28px", lineHeight: 1.6 }}>
          {hasQuestions
            ? `Answer ${questions.length} quick question${questions.length > 1 ? "s" : ""}. Our AI evaluates your fit in seconds.`
            : "Click submit to apply instantly. No questions required for this group."}
        </p>

        {/* Progress */}
        {hasQuestions && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF" }}>
                Question {currentQ + 1} of {questions.length}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1A3A8F" }}>
                {Math.round(((currentQ) / questions.length) * 100)}%
              </span>
            </div>
            <Steps current={currentQ} total={questions.length} />
          </div>
        )}

        {/* Question or no-questions state */}
        {hasQuestions ? (
          <div>
            <div style={{
              backgroundColor: "#fff", border: "1.5px solid #E5E7EB",
              borderRadius: 16, padding: "20px",
              marginBottom: 16,
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 16px", lineHeight: 1.5 }}>
                {q.question}
              </p>
              <textarea
                value={currentAnswer}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder={q.placeholder ?? "Share a specific example from your experience…"}
                rows={5}
                style={{
                  width: "100%", boxSizing: "border-box",
                  fontSize: 14, lineHeight: 1.65, color: "#111827",
                  border: "1.5px solid #E5E7EB", borderRadius: 10,
                  padding: "12px 14px", fontFamily: "inherit", resize: "none",
                  outline: "none", backgroundColor: "#FAFAFA",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.target.style.borderColor = "#1A3A8F")}
                onBlur={e => (e.target.style.borderColor = "#E5E7EB")}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: currentAnswer.length < 15 ? "#9CA3AF" : "#1A3A8F" }}>
                  {currentAnswer.length} chars {currentAnswer.length < 15 ? `(min 15)` : "✓"}
                </span>
              </div>
            </div>

            {/* Tip */}
            <div style={{
              backgroundColor: "rgba(26,58,143,0.05)", borderRadius: 10,
              padding: "10px 14px", marginBottom: 24,
            }}>
              <p style={{ fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>
                💡 <strong style={{ color: "#374151" }}>Tip:</strong> Be specific — mention your company, team size, or a real project. Vague answers score lower.
              </p>
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", gap: 10 }}>
              {currentQ > 0 && (
                <button
                  onClick={() => setCurrentQ(q => q - 1)}
                  style={{
                    flex: "0 0 auto", padding: "13px 18px",
                    backgroundColor: "#F3F4F6", color: "#374151",
                    fontSize: 14, fontWeight: 600, borderRadius: 12,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  ←
                </button>
              )}
              {isLastQ ? (
                <button
                  onClick={handleSubmit}
                  disabled={!isAnswered || submitting}
                  style={{
                    flex: 1, padding: "14px",
                    backgroundColor: isAnswered ? "#1A3A8F" : "#E5E7EB",
                    color: isAnswered ? "#fff" : "#9CA3AF",
                    fontSize: 15, fontWeight: 800, borderRadius: 12,
                    border: "none", cursor: isAnswered ? "pointer" : "not-allowed",
                    fontFamily: "inherit", letterSpacing: "-0.2px",
                    transition: "background 0.15s",
                  }}
                >
                  {submitting ? "Submitting…" : "Submit application →"}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQ(q => q + 1)}
                  disabled={!isAnswered}
                  style={{
                    flex: 1, padding: "14px",
                    backgroundColor: isAnswered ? "#1A3A8F" : "#E5E7EB",
                    color: isAnswered ? "#fff" : "#9CA3AF",
                    fontSize: 15, fontWeight: 800, borderRadius: 12,
                    border: "none", cursor: isAnswered ? "pointer" : "not-allowed",
                    fontFamily: "inherit", letterSpacing: "-0.2px",
                    transition: "background 0.15s",
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        ) : (
          // No questions — instant apply
          <div>
            <div style={{
              backgroundColor: "#fff", border: "1.5px solid #E5E7EB",
              borderRadius: 16, padding: "24px 20px", marginBottom: 24, textAlign: "center",
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>
                Instant access
              </p>
              <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, lineHeight: 1.6 }}>
                This group doesn&apos;t require screening questions. Your application will be reviewed instantly.
              </p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: "100%", padding: "14px",
                backgroundColor: "#1A3A8F", color: "#fff",
                fontSize: 15, fontWeight: 800, borderRadius: 12,
                border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.2px",
              }}
            >
              {submitting ? "Applying…" : "Apply now →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
