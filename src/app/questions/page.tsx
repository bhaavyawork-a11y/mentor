"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import questionsData from "@/data/questions.json";
import GuestBanner from "@/components/GuestBanner";
import { useSession } from "@/hooks/useSession";

/* ─── Types ─────────────────────────────────────── */
interface Question {
  id: string;
  question: string;
  role: string;
  company: string;
  difficulty: "Easy" | "Medium" | "Hard";
  type: "Behavioral" | "Technical" | "Case Study" | "Situational";
}

interface ExpertAnswer {
  answer: string;
  keyPoints: string[];
  commonMistakes: string[];
}

interface FeedbackResult {
  score: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
  keyPoints: string[];
}

const QUESTIONS = questionsData as Question[];

/* ─── Filter options ────────────────────────────── */
const ROLES = ["All", "Product Manager", "Software Engineer", "Data Analyst", "Founder's Office", "Growth", "Marketing", "Operations", "Finance"];
const COMPANIES = ["All", "Swiggy", "Razorpay", "CRED", "Zepto", "Meesho", "PhonePe", "Groww", "Flipkart", "Google", "Microsoft"];
const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"];
const TYPES = ["All", "Behavioral", "Technical", "Case Study", "Situational"];

/* ─── Helpers ───────────────────────────────────── */
const DIFF_COLOR: Record<string, string> = {
  Easy: "#00C9A7",
  Medium: "#FDE68A",
  Hard: "#C4B5FD",
};
const DIFF_TEXT: Record<string, string> = {
  Easy: "#1B3A35",
  Medium: "#8a7200",
  Hard: "#5b3fa8",
};

const COMPANY_COLORS = ["#FDE68A", "#C4B5FD", "#00C9A7", "#FFB5C8", "#B5D5FF", "#FFCBA4", "#B5FFD9", "#FFB5B5", "#D5B5FF", "#B5E5FF", "#FFD9B5"];

function companyColor(company: string) {
  let hash = 0;
  for (const c of company) hash = (hash * 31 + c.charCodeAt(0)) & 0xfffff;
  return COMPANY_COLORS[hash % COMPANY_COLORS.length];
}

/* ─── Answer Modal ──────────────────────────────── */
function AnswerModal({ question, onClose }: { question: Question; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<ExpertAnswer | null>(null);

  const loadAnswer = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/question-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.question, role: question.role, company: question.company }),
      });
      const data = await res.json() as ExpertAnswer;
      setAnswer(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)" }} onClick={onClose} />

      {/* Sheet */}
      <div style={{
        position: "relative", backgroundColor: "#fff", borderRadius: "20px 20px 0 0",
        padding: "28px 28px 40px", maxHeight: "80vh", overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
      }}>
        {/* Handle */}
        <div style={{ width: 40, height: 4, backgroundColor: "#eee", borderRadius: 99, margin: "0 auto 20px" }} />

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: DIFF_COLOR[question.difficulty], color: DIFF_TEXT[question.difficulty], borderRadius: 99, padding: "3px 10px" }}>{question.difficulty}</span>
          <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#f0f0f0", color: "#888", borderRadius: 99, padding: "3px 10px" }}>{question.type}</span>
          <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#f0f0f0", color: "#888", borderRadius: 99, padding: "3px 10px" }}>{question.role}</span>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: "0 0 20px", lineHeight: 1.4 }}>{question.question}</h2>

        {!answer && (
          <button className="btn-primary" onClick={loadAnswer} disabled={loading} style={{ opacity: loading ? 0.6 : 1, marginBottom: 20 }}>
            {loading ? "Generating expert answer…" : "✨ Generate Expert Answer"}
          </button>
        )}

        {answer && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ backgroundColor: "#f8fffe", border: "1px solid #00C9A733", borderRadius: 12, padding: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#00C9A7", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Expert Answer</p>
              <p style={{ fontSize: 14, color: "#1a1a1a", lineHeight: 1.7, margin: 0 }}>{answer.answer}</p>
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Key Points to Cover</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {(answer.keyPoints || []).map((pt, i) => (
                  <li key={i} style={{ fontSize: 13, color: "#333", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#00C9A7", fontWeight: 700, flexShrink: 0 }}>✓</span> {pt}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Common Mistakes to Avoid</p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {(answer.commonMistakes || []).map((m, i) => (
                  <li key={i} style={{ fontSize: 13, color: "#555", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#ff6b6b", flexShrink: 0 }}>✕</span> {m}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ backgroundColor: "#1B3A35", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>Want personalised coaching?</p>
                <p style={{ fontSize: 12, color: "#00C9A799", margin: 0 }}>Book a mock interview with a {question.role} mentor</p>
              </div>
              <Link href={`/experts`} style={{ backgroundColor: "#00C9A7", color: "#1B3A35", fontSize: 12, fontWeight: 800, borderRadius: 8, padding: "8px 16px", textDecoration: "none", whiteSpace: "nowrap" }}>
                Find mentor →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Practice Modal ────────────────────────────── */
function PracticeModal({ question, onClose }: { question: Question; onClose: () => void }) {
  const [userAnswer, setUserAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);

  const handleSubmit = async () => {
    if (!userAnswer.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/ai/question-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.question, answer: userAnswer, role: question.role }),
      });
      const data = await res.json() as FeedbackResult;
      setFeedback(data);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (n: number) => n >= 8 ? "#00C9A7" : n >= 6 ? "#FDE68A" : "#ff6b6b";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{
        backgroundColor: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 640,
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px" }}>Practice Mode</p>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", margin: 0, lineHeight: 1.4, maxWidth: 520 }}>{question.question}</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#888", flexShrink: 0, marginLeft: 12 }}>✕</button>
        </div>

        {!feedback ? (
          <>
            <label className="label">Your answer</label>
            <textarea
              className="input"
              rows={8}
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer here. Treat this as a real interview — be specific and use examples…"
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading || !userAnswer.trim()}
              style={{ marginTop: 16, opacity: loading || !userAnswer.trim() ? 0.6 : 1 }}
            >
              {loading ? "Evaluating…" : "Submit for Feedback →"}
            </button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Score */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, backgroundColor: "#fafafa", borderRadius: 12, padding: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: scoreColor(feedback.score) + "22", border: `3px solid ${scoreColor(feedback.score)}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(feedback.score) }}>{feedback.score}</span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: "0 0 2px" }}>
                  {feedback.score >= 8 ? "Excellent answer!" : feedback.score >= 6 ? "Good, with room to improve" : "Needs more work"}
                </p>
                <p style={{ fontSize: 12, color: "#888", margin: 0 }}>Score: {feedback.score}/10</p>
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#00C9A7", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Strengths</p>
              {(feedback.strengths || []).map((s, i) => (
                <p key={i} style={{ fontSize: 13, color: "#333", display: "flex", gap: 8, margin: "0 0 6px" }}><span style={{ color: "#00C9A7" }}>✓</span> {s}</p>
              ))}
            </div>

            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#ff6b6b", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Improvements</p>
              {(feedback.improvements || []).map((s, i) => (
                <p key={i} style={{ fontSize: 13, color: "#333", display: "flex", gap: 8, margin: "0 0 6px" }}><span style={{ color: "#ff6b6b" }}>→</span> {s}</p>
              ))}
            </div>

            <div style={{ backgroundColor: "#f8fffe", border: "1px solid #00C9A733", borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#00C9A7", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px" }}>Model Answer</p>
              <p style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.7, margin: 0 }}>{feedback.modelAnswer}</p>
            </div>

            <button className="btn-outline" onClick={() => { setFeedback(null); setUserAnswer(""); }}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Question Card ─────────────────────────────── */
function QuestionCard({
  q,
  onViewAnswer,
  onPractice,
}: {
  q: Question;
  onViewAnswer: () => void;
  onPractice: () => void;
}) {
  const bg = companyColor(q.company);
  const initial = q.company[0]?.toUpperCase() ?? "?";

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: DIFF_COLOR[q.difficulty] + "33", color: DIFF_TEXT[q.difficulty], borderRadius: 99, padding: "3px 10px" }}>{q.difficulty}</span>
        <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#f0f0f0", color: "#888", borderRadius: 99, padding: "3px 10px" }}>{q.type}</span>
        <div style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 8, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#1a1a1a", flexShrink: 0 }}>
          {initial}
        </div>
      </div>

      {/* Question text */}
      <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {q.question}
      </p>

      {/* Role tag */}
      <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "#FAF7F2", color: "#888", borderRadius: 99, padding: "3px 10px", alignSelf: "flex-start" }}>
        {q.role === "General" ? "All roles" : q.role}
      </span>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <button
          onClick={onViewAnswer}
          style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#1B3A35", color: "#00C9A7", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}
        >
          View answer →
        </button>
        <button
          onClick={onPractice}
          style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#FDE68A", color: "#1a1a1a", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer" }}
        >
          Practice with AI →
        </button>
      </div>
    </div>
  );
}

/* ─── Pill filter row ───────────────────────────── */
function PillRow({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            flexShrink: 0,
            fontSize: 12, fontWeight: value === opt ? 700 : 500,
            backgroundColor: value === opt ? "#1B3A35" : "#f0f0f0",
            color: value === opt ? "#00C9A7" : "#555",
            border: "none", borderRadius: 99, padding: "6px 14px", cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
export default function QuestionsPage() {
  const { session, loading: sessionLoading } = useSession();
  const isGuest = !sessionLoading && !session;

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All");
  const [company, setCompany] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [type, setType] = useState("All");
  const [answerQ, setAnswerQ] = useState<Question | null>(null);
  const [practiceQ, setPracticeQ] = useState<Question | null>(null);

  const filtered = useMemo(() => {
    return QUESTIONS.filter((q) => {
      if (role !== "All" && q.role !== role) return false;
      if (company !== "All" && q.company !== company) return false;
      if (difficulty !== "All" && q.difficulty !== difficulty) return false;
      if (type !== "All" && q.type !== type) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!q.question.toLowerCase().includes(s) && !q.role.toLowerCase().includes(s) && !q.company.toLowerCase().includes(s) && !q.type.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [search, role, company, difficulty, type]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 0" }}>
      <GuestBanner />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>Interview Question Bank</h1>
        <p style={{ fontSize: 14, color: "#888", margin: 0 }}>Role and company-specific questions, expert-curated. Free to browse.</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28, backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: "18px 20px" }}>
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by role, company or topic…"
          style={{ width: "100%", boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Role</p>
          <PillRow options={ROLES} value={role} onChange={setRole} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Company</p>
          <PillRow options={COMPANIES} value={company} onChange={setCompany} />
        </div>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Difficulty</p>
            <PillRow options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Type</p>
            <PillRow options={TYPES} value={type} onChange={setType} />
          </div>
        </div>
      </div>

      {/* Count */}
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px" }}>{filtered.length} question{filtered.length !== 1 ? "s" : ""}</p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ fontSize: 14, color: "#888" }}>No questions match your filters.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {filtered.map((q, idx) => (
            <div key={q.id} style={{ position: "relative" }}>
              <QuestionCard
                q={q}
                onViewAnswer={() => setAnswerQ(q)}
                onPractice={() => setPracticeQ(q)}
              />
              {/* Blur gate for guests on cards 4+ */}
              {isGuest && idx >= 3 && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 14,
                  backdropFilter: "blur(6px)",
                  backgroundColor: "rgba(255,255,255,0.75)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Link
                    href="/auth/login"
                    style={{
                      fontSize: 12, fontWeight: 800,
                      backgroundColor: "#1B3A35", color: "#00C9A7",
                      borderRadius: 99, padding: "10px 20px",
                      textDecoration: "none", whiteSpace: "nowrap",
                    }}
                  >
                    Sign up free to unlock all answers →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {answerQ && <AnswerModal question={answerQ} onClose={() => setAnswerQ(null)} />}
      {practiceQ && <PracticeModal question={practiceQ} onClose={() => setPracticeQ(null)} />}
    </div>
  );
}
