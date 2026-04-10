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
  screening_questions: ScreeningQuestion[];
}

interface ApplicationData {
  answers: Record<string, string>;
  ai_score: number | null;
  ai_feedback: string | null;
}

const textareaStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "10px 12px",
  fontSize: 13, border: "1px solid #1F2937", borderRadius: 8,
  fontFamily: "inherit", outline: "none", backgroundColor: "#181C24", color: "#F9FAFB",
  minHeight: 80, resize: "vertical" as const, lineHeight: 1.5,
};

export default function ReapplyPage() {
  const params = useParams();
  const router = useRouter();
  const { session } = useSession();
  const supabase = createClient();

  const slug = params.slug as string;
  const userId = session?.user?.id ?? null;

  const [community, setCommunity] = useState<Community | null>(null);
  const [prevApp, setPrevApp] = useState<ApplicationData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    status: "approved" | "rejected";
    score: number;
    feedback: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load community and previous application
  useEffect(() => {
    if (!userId || !slug) return;

    (async () => {
      try {
        // Fetch community
        const { data: commData, error: commErr } = await supabase
          .from("communities")
          .select("id, slug, name, screening_questions")
          .eq("slug", slug)
          .single();

        if (commErr || !commData) {
          router.push("/communities");
          return;
        }

        const community = commData as Community;
        setCommunity(community);

        // Fetch previous application
        const { data: appData } = await supabase
          .from("community_applications")
          .select("answers, ai_score, ai_feedback")
          .eq("user_id", userId)
          .eq("community_id", community.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (appData) {
          const prev = appData as ApplicationData;
          setPrevApp(prev);
          // Pre-fill with previous answers
          if (prev.answers && typeof prev.answers === "object") {
            setAnswers(prev.answers as Record<string, string>);
          }
        }

        setLoading(false);
      } catch (e) {
        console.error("Error loading reapply page:", e);
        setLoading(false);
      }
    })();
  }, [userId, slug, supabase, router]);

  const canSubmit = community?.screening_questions.every(
    q => (answers[q.id] || "").trim().length >= 50
  ) ?? false;

  const handleSubmit = async () => {
    if (!community || !userId) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/groups/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community_id: community.id, answers }),
      });

      const data = await res.json();
      const r = {
        status: data.status as "approved" | "rejected",
        score: data.score ?? 0,
        feedback: data.feedback ?? "",
      };
      setResult(r);
    } catch (e) {
      console.error("Submit error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
        <p style={{ fontSize: 14, color: "#6B7280" }}>Loading…</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
        <p style={{ fontSize: 14, color: "#FCA5A5" }}>Community not found</p>
        <Link href="/communities" style={{ color: "#F9FAFB", textDecoration: "none", fontWeight: 600 }}>
          ← Back to Groups
        </Link>
      </div>
    );
  }

  if (result) {
    const ok = result.status === "approved";
    return (
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px" }}>
        <div style={{ backgroundColor: "#181C24", border: "1.5px solid #1F2937", borderRadius: 14, padding: "32px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 32 }}>{ok ? "🎉" : "😔"}</span>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: ok ? "#0A3323" : "#c0714a", margin: 0 }}>
                {ok ? `Welcome to ${community.name}!` : "Application not approved"}
              </h2>
              <p style={{ fontSize: 13, color: "#6B7280", margin: "4px 0 0" }}>AI score: {result.score}/100</p>
            </div>
          </div>

          <p style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.6, margin: "0 0 20px" }}>
            {result.feedback}
          </p>

          {ok ? (
            <Link href={`/communities/${community.slug}`} style={{
              display: "inline-block", padding: "11px 22px", backgroundColor: "#064E3B",
              color: "#F9FAFB", borderRadius: 10, fontSize: 13, fontWeight: 700,
              textDecoration: "none",
            }}>
              Enter group →
            </Link>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setResult(null)} style={{
                padding: "11px 22px", borderRadius: 10, border: "1.5px solid #1F2937",
                backgroundColor: "#181C24", color: "#9CA3AF", fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Try again
              </button>
              <Link href="/communities" style={{
                padding: "11px 22px", borderRadius: 10, border: "1.5px solid #1F2937",
                backgroundColor: "#181C24", color: "#9CA3AF", fontSize: 13, fontWeight: 700,
                textDecoration: "none", display: "inline-block",
              }}>
                Try a different group
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 20px 80px" }}>
      {/* Header */}
      <Link href="/communities" style={{ fontSize: 12, color: "#6B7280", textDecoration: "none", fontWeight: 600, display: "block", marginBottom: 24 }}>
        ← Back to Groups
      </Link>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F9FAFB", margin: "0 0 6px" }}>
          Reapply to {community.name}
        </h1>
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>
          Your previous application was reviewed by AI. Below is the feedback and your original answers. Improve your responses based on the feedback.
        </p>
      </div>

      {/* Previous feedback */}
      {prevApp && (
        <div style={{
          backgroundColor: prevApp.ai_score && prevApp.ai_score >= 70 ? "#e6f4ea" : "#fff8f5",
          border: `1.5px solid ${prevApp.ai_score && prevApp.ai_score >= 70 ? "#c5ebc1" : "#f0cbbf"}`,
          borderRadius: 12,
          padding: "18px",
          marginBottom: 28,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#F9FAFB", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>
            Previous Feedback
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span style={{
                display: "inline-block",
                fontSize: 14,
                fontWeight: 800,
                color: prevApp.ai_score && prevApp.ai_score >= 70 ? "#0A3323" : "#c0714a",
              }}>
                Score: {prevApp.ai_score ?? "—"}/100
              </span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, lineHeight: 1.6 }}>
            {prevApp.ai_feedback}
          </p>
        </div>
      )}

      {/* Form */}
      <div style={{ backgroundColor: "#181C24", border: "1.5px solid #1F2937", borderRadius: 14, padding: "24px" }}>
        <p style={{ fontSize: 12, color: "#6B7280", margin: "0 0 20px", lineHeight: 1.5 }}>
          Answer {community.screening_questions.length} short questions. Minimum 50 characters per answer. Be specific with real examples.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {community.screening_questions.map((q, i) => {
            const val = answers[q.id] || "";
            const charCount = val.trim().length;
            const minChars = 50;
            const isSufficient = charCount >= minChars;

            return (
              <div key={q.id}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#F9FAFB",
                  marginBottom: 8,
                  lineHeight: 1.4,
                }}>
                  Q{i + 1}. {q.question}
                </label>
                <textarea
                  value={val}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder={q.placeholder ?? "Be specific — give real examples…"}
                  style={{
                    ...textareaStyle,
                    borderColor: charCount > 0 && !isSufficient ? "#e8b4a0" : "#e8e4ce",
                  }}
                />
                <div style={{
                  fontSize: 11,
                  color: isSufficient ? "#839958" : charCount > 0 ? "#c0714a" : "#b0ab8c",
                  marginTop: 6,
                  fontWeight: 500,
                }}>
                  {charCount} characters (min. {minChars})
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, gap: 10 }}>
          <Link href="/communities" style={{
            padding: "11px 22px", borderRadius: 10, border: "1.5px solid #1F2937",
            backgroundColor: "#181C24", color: "#9CA3AF", fontSize: 13, fontWeight: 700,
            textDecoration: "none", cursor: "pointer",
          }}>
            Cancel
          </Link>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            style={{
              padding: "11px 22px", borderRadius: 10, border: "none",
              backgroundColor: canSubmit && !submitting ? "#0A3323" : "#c8c4ae",
              color: "#F9FAFB", fontSize: 13, fontWeight: 700,
              cursor: canSubmit && !submitting ? "pointer" : "default",
              fontFamily: "inherit",
            }}
          >
            {submitting ? "Evaluating…" : "Reapply →"}
          </button>
        </div>
      </div>
    </div>
  );
}
