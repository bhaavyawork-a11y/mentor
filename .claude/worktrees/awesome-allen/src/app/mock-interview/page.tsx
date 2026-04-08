"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";

/* ─── Types ─────────────────────────────────────── */
interface Question {
  id: string;
  text: string;
  type: string;
  tips: string;
}

interface QuestionResult {
  score: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
}

interface EvalResult {
  overallScore: number;
  level: string;
  xpEarned: number;
  questionScores: QuestionResult[];
  topStrengths: string[];
  topImprovements: string[];
  nextStep: string;
}

type Step = "setup" | "interview" | "results";

/* ─── Helpers ───────────────────────────────────── */
const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  "Strong candidate":  { bg: "#839958", color: "#0A3323" },
  "Good candidate":    { bg: "#F7F4D5", color: "#0A3323" },
  "Needs preparation": { bg: "#D3968C", color: "#0A3323" },
  "Not ready yet":     { bg: "#e8e4ce", color: "#839958" },
};

function scoreColor(n: number) {
  if (n >= 8) return "#839958";
  if (n >= 6) return "#F7F4D5";
  return "#D3968C";
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* ─── Pill group ────────────────────────────────── */
function PillGroup<T extends string | number>({ options, value, onChange }: { options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            fontSize: 13, fontWeight: value === opt ? 700 : 500,
            backgroundColor: value === opt ? "#0A3323" : "#e8e4ce",
            color: value === opt ? "#839958" : "#555",
            border: "none", borderRadius: 99, padding: "8px 18px",
            cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ─── Step 1: Setup ─────────────────────────────── */
function SetupScreen({ onStart }: { onStart: (cfg: InterviewConfig) => void }) {
  const { profile } = useProfile();
  const [type, setType] = useState<InterviewConfig["type"]>("Behavioral");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [difficulty, setDifficulty] = useState<InterviewConfig["difficulty"]>("Medium");
  const [count, setCount] = useState<3 | 5 | 8>(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.target_role) setRole(profile.target_role);
  }, [profile?.target_role]);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/mock-interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, role, company, difficulty, count }),
      });
      const data = await res.json() as { questions: Question[] };
      onStart({ type, role, company, difficulty, count, questions: data.questions ?? [] });
    } catch {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "40px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎙️</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a1a", margin: "0 0 8px" }}>AI Mock Interview</h1>
        <p style={{ fontSize: 14, color: "#839958", margin: 0 }}>Practice with AI. Get scored. Upgrade to a human expert when ready.</p>
      </div>

      <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Interview type */}
        <div>
          <label className="label">Interview type</label>
          <PillGroup options={["Technical", "Behavioral", "Case Study", "PM Interview", "Mixed"] as const} value={type} onChange={setType} />
        </div>

        {/* Role */}
        <div>
          <label className="label">Target role</label>
          <input
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Senior Product Manager"
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        {/* Company */}
        <div>
          <label className="label">Target company <span style={{ fontWeight: 400, color: "#b0ab8c" }}>(optional — we'll tailor questions to their style)</span></label>
          <input
            className="input"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="e.g. Razorpay, CRED, Google…"
            style={{ width: "100%", boxSizing: "border-box" }}
          />
        </div>

        {/* Difficulty */}
        <div>
          <label className="label">Difficulty</label>
          <PillGroup options={["Easy", "Medium", "Hard"] as const} value={difficulty} onChange={setDifficulty} />
        </div>

        {/* Count */}
        <div>
          <label className="label">Number of questions</label>
          <PillGroup<3 | 5 | 8> options={[3, 5, 8]} value={count} onChange={(v) => setCount(v)} />
        </div>

        <button
          className="btn-primary"
          onClick={handleStart}
          disabled={loading || !role.trim()}
          style={{ width: "100%", opacity: loading || !role.trim() ? 0.6 : 1, fontSize: 15, padding: "14px 0", marginTop: 4 }}
        >
          {loading ? "Generating questions…" : "Start interview →"}
        </button>
      </div>
    </div>
  );
}

/* ─── Step 2: Interview ─────────────────────────── */
interface InterviewConfig {
  type: "Technical" | "Behavioral" | "Case Study" | "PM Interview" | "Mixed";
  role: string;
  company: string;
  difficulty: "Easy" | "Medium" | "Hard";
  count: 3 | 5 | 8;
  questions: Question[];
}

function InterviewScreen({ config, onSubmit }: { config: InterviewConfig; onSubmit: (answers: { question: string; answer: string }[]) => void }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(config.questions.length).fill(""));
  const [thinkTime, setThinkTime] = useState(30);
  const [thinking, setThinking] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Total elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Think time countdown
  useEffect(() => {
    setThinkTime(30);
    setThinking(true);
    const t = setInterval(() => {
      setThinkTime((prev) => {
        if (prev <= 1) { clearInterval(t); setThinking(false); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [current]);

  const q = config.questions[current];
  const isLast = current === config.questions.length - 1;
  const wordCount = answers[current]?.trim().split(/\s+/).filter(Boolean).length ?? 0;

  const handleNext = () => {
    if (isLast) {
      if (timerRef.current) clearInterval(timerRef.current);
      onSubmit(config.questions.map((q, i) => ({ question: q.text, answer: answers[i] ?? "" })));
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const handleEnd = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onSubmit(config.questions.map((q, i) => ({ question: q.text, answer: answers[i] ?? "" })));
  };

  if (!q) return null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "#F9F7EC" }}>
      {/* Top bar */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #e8e4ce", padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>Question {current + 1} of {config.questions.length}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {config.questions.map((_, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: i < current ? "#839958" : i === current ? "#0A3323" : "#e8e4ce" }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "#839958", fontFamily: "monospace" }}>{formatTime(elapsed)}</span>
          <button onClick={handleEnd} style={{ fontSize: 12, fontWeight: 600, backgroundColor: "transparent", color: "#839958", border: "1px solid #e8e4ce", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
            End interview
          </button>
        </div>
      </div>

      {/* Question area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px 32px" }}>
        <div style={{ width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", gap: 28 }}>
          {/* Type badge */}
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#0A3323", color: "#839958", borderRadius: 99, padding: "4px 14px" }}>
              {q.type}
            </span>
          </div>

          {/* Question */}
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", textAlign: "center", lineHeight: 1.45, margin: 0 }}>
            {q.text}
          </h2>

          {/* Think time */}
          {thinking && thinkTime > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "#F7F4D522", border: "1px solid #F7F4D5", borderRadius: 10, padding: "10px 18px" }}>
                <span style={{ fontSize: 13, color: "#8a7200", fontWeight: 600 }}>💭 Think time: {thinkTime}s</span>
                <button onClick={() => setThinking(false)} style={{ fontSize: 11, color: "#8a7200", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>skip</button>
              </div>
            </div>
          )}

          {/* Tip */}
          {!thinking && (
            <div style={{ backgroundColor: "#f8fffe", border: "1px solid #83995833", borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>💡 {q.tips}</p>
            </div>
          )}

          {/* Answer textarea */}
          <div style={{ position: "relative" }}>
            <textarea
              value={answers[current]}
              onChange={(e) => setAnswers((prev) => { const next = [...prev]; next[current] = e.target.value; return next; })}
              placeholder={thinking ? "Take a moment to think…" : "Type your answer here…"}
              disabled={thinking && thinkTime > 0}
              style={{
                width: "100%", boxSizing: "border-box",
                minHeight: 220, resize: "vertical",
                border: `2px solid ${thinking && thinkTime > 0 ? "#e8e4ce" : "#0A3323"}`,
                borderRadius: 14, padding: "16px 18px",
                fontSize: 15, color: "#1a1a1a", lineHeight: 1.65,
                backgroundColor: thinking && thinkTime > 0 ? "#f8f8f8" : "#fff",
                outline: "none", fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#839958"}
              onBlur={(e) => e.currentTarget.style.borderColor = "#0A3323"}
            />
            <span style={{ position: "absolute", bottom: 12, right: 14, fontSize: 11, color: "#b0ab8c" }}>
              {wordCount} words
            </span>
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              style={{ fontSize: 13, fontWeight: 600, backgroundColor: "transparent", color: current === 0 ? "#ccc" : "#839958", border: "1px solid #e8e4ce", borderRadius: 10, padding: "10px 20px", cursor: current === 0 ? "default" : "pointer" }}
            >
              ← Back
            </button>
            <button
              className="btn-primary"
              onClick={handleNext}
              style={{ fontSize: 14, padding: "12px 28px" }}
            >
              {isLast ? "Submit for feedback →" : "Next question →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step 3: Results ───────────────────────────── */
function ResultsScreen({ config, answers, onRetry }: {
  config: InterviewConfig;
  answers: { question: string; answer: string }[];
  onRetry: () => void;
}) {
  const [result, setResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const evaluated = useRef(false);

  const evaluate = useCallback(async () => {
    if (evaluated.current) return;
    evaluated.current = true;
    try {
      const res = await fetch("/api/ai/mock-interview-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: answers, role: config.role, company: config.company, type: config.type, difficulty: config.difficulty }),
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data = await res.json() as EvalResult;
      setResult(data);
      // Save score + award XP (fire-and-forget)
      fetch("/api/ai/mock-interview-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: data.overallScore, xpEarned: data.xpEarned }),
      }).catch(() => {/* non-critical */});
    } catch {
      setError("Evaluation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [answers, config]);

  useEffect(() => { evaluate(); }, [evaluate]);

  if (loading) {
    return (
      <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", margin: "0 0 8px" }}>Evaluating your answers…</h2>
        <p style={{ fontSize: 14, color: "#839958" }}>Claude is reviewing each answer. This takes about 15 seconds.</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div style={{ maxWidth: 600, margin: "80px auto", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "#ff6b6b" }}>{error ?? "Something went wrong."}</p>
        <button className="btn-primary" onClick={onRetry} style={{ marginTop: 16 }}>Try again</button>
      </div>
    );
  }

  const lvStyle = LEVEL_STYLE[result.level] ?? LEVEL_STYLE["Good candidate"];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 0" }}>
      {/* Overall score card */}
      <div style={{ backgroundColor: "#0A3323", borderRadius: 20, padding: "36px 32px", textAlign: "center", marginBottom: 28 }}>
        <p style={{ fontSize: 56, fontWeight: 800, color: "#839958", margin: "0 0 8px", lineHeight: 1 }}>
          {result.overallScore.toFixed(1)}
          <span style={{ fontSize: 24, color: "#83995899" }}> / 10</span>
        </p>
        <span style={{ fontSize: 14, fontWeight: 700, backgroundColor: lvStyle.bg, color: lvStyle.color, borderRadius: 99, padding: "6px 18px", display: "inline-block", marginBottom: 16 }}>
          {result.level}
        </span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, backgroundColor: "#F7F4D522", border: "1px solid #F7F4D544", borderRadius: 10, padding: "8px 18px" }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#F7F4D5" }}>+{result.xpEarned} XP earned</span>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 16, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8e4ce" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>Question-by-question breakdown</p>
        </div>
        {(result.questionScores ?? []).map((qs, i) => {
          const q = answers[i];
          const isOpen = open === i;
          const color = scoreColor(qs.score);
          return (
            <div key={i} style={{ borderTop: i === 0 ? "none" : "1px solid #e8e4ce" }}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color }}>{qs.score}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    Q{i + 1}: {q?.question}
                  </p>
                  <div style={{ width: "100%", height: 4, backgroundColor: "#e8e4ce", borderRadius: 99, overflow: "hidden", marginTop: 4 }}>
                    <div style={{ width: `${qs.score * 10}%`, height: "100%", backgroundColor: color, borderRadius: 99 }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "#839958", flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Your answer */}
                  <div style={{ backgroundColor: "#fafafa", borderRadius: 10, padding: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>Your answer</p>
                    <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, margin: 0 }}>{q?.answer || <em style={{ color: "#b0ab8c" }}>No answer given</em>}</p>
                  </div>

                  {/* Strengths */}
                  {qs.strengths?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Strengths</p>
                      {qs.strengths.map((s, j) => <p key={j} style={{ fontSize: 13, color: "#333", margin: "0 0 6px", display: "flex", gap: 8 }}><span style={{ color: "#839958" }}>✓</span>{s}</p>)}
                    </div>
                  )}

                  {/* Improvements */}
                  {qs.improvements?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#F7F4D5", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Improvements</p>
                      {qs.improvements.map((s, j) => <p key={j} style={{ fontSize: 13, color: "#555", margin: "0 0 6px", display: "flex", gap: 8 }}><span style={{ color: "#F7F4D5" }}>→</span>{s}</p>)}
                    </div>
                  )}

                  {/* Model answer */}
                  {qs.modelAnswer && (
                    <div style={{ backgroundColor: "#f8fffe", border: "1px solid #83995833", borderRadius: 10, padding: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>Model answer</p>
                      <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.7, margin: 0 }}>{qs.modelAnswer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall feedback */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Top strengths</p>
          {(result.topStrengths ?? []).map((s, i) => (
            <p key={i} style={{ fontSize: 13, color: "#333", margin: "0 0 8px", display: "flex", gap: 8 }}><span style={{ color: "#839958", flexShrink: 0 }}>✓</span>{s}</p>
          ))}
        </div>
        <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#F7F4D5", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 12px" }}>Areas to improve</p>
          {(result.topImprovements ?? []).map((s, i) => (
            <p key={i} style={{ fontSize: 13, color: "#555", margin: "0 0 8px", display: "flex", gap: 8 }}><span style={{ color: "#F7F4D5", flexShrink: 0 }}>→</span>{s}</p>
          ))}
        </div>
      </div>

      {/* Next step */}
      {result.nextStep && (
        <div style={{ backgroundColor: "#F9F7EC", border: "1px solid #e8e4ce", borderRadius: 14, padding: 18, marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>Recommended next step</p>
          <p style={{ fontSize: 14, color: "#1a1a1a", lineHeight: 1.6, margin: 0 }}>👉 {result.nextStep}</p>
        </div>
      )}

      {/* CTAs */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          className="btn-outline"
          onClick={onRetry}
          style={{ flex: 1, padding: "14px 0", fontSize: 14 }}
        >
          Practice again
        </button>
        <Link
          href="/experts"
          style={{ flex: 1, padding: "14px 0", fontSize: 14, fontWeight: 700, backgroundColor: "#0A3323", color: "#839958", borderRadius: 10, textDecoration: "none", textAlign: "center", display: "block" }}
        >
          Book a human mock interview →
        </Link>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
export default function MockInterviewPage() {
  const [step, setStep] = useState<Step>("setup");
  const [config, setConfig] = useState<InterviewConfig | null>(null);
  const [answers, setAnswers] = useState<{ question: string; answer: string }[]>([]);

  const handleStart = (cfg: InterviewConfig) => {
    setConfig(cfg);
    setStep("interview");
  };

  const handleSubmit = (ans: { question: string; answer: string }[]) => {
    setAnswers(ans);
    setStep("results");
  };

  const handleRetry = () => {
    setConfig(null);
    setAnswers([]);
    setStep("setup");
  };

  if (step === "interview" && config) {
    return <InterviewScreen config={config} onSubmit={handleSubmit} />;
  }

  if (step === "results" && config) {
    return (
      <div style={{ padding: "0 0 60px" }}>
        <ResultsScreen config={config} answers={answers} onRetry={handleRetry} />
      </div>
    );
  }

  return <SetupScreen onStart={handleStart} />;
}
