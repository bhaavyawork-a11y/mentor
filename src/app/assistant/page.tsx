"use client";

import { useState, useRef, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── Quick prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { icon: "💰", label: "Salary intel",      prompt: "What's a competitive salary range for my role and experience level in India?" },
  { icon: "🎯", label: "Interview prep",    prompt: "Give me the top 10 interview questions for my target role and how to answer them." },
  { icon: "📋", label: "Evaluate an offer", prompt: "Help me evaluate a job offer. I'll share the details." },
  { icon: "🤝", label: "Ask for a referral",prompt: "Write a short, non-awkward message I can send to someone asking for a job referral." },
  { icon: "📝", label: "Resume tips",       prompt: "What are the most common resume mistakes for early-career professionals in India?" },
  { icon: "🏢", label: "Company research",  prompt: "How should I research a company before an interview? What questions should I ask?" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatContent(text: string) {
  // Simple markdown-lite: bold **text**, line breaks
  return text
    .split("\n")
    .map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} style={{ margin: "0 0 8px", lineHeight: 1.7 }}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
        </p>
      );
    });
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14 }}>
      {!isUser && (
        <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#0A3323", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginRight: 10, marginTop: 2 }}>
          ✨
        </div>
      )}
      <div style={{
        maxWidth: "78%",
        backgroundColor: isUser ? "#0A3323" : "#fff",
        color: isUser ? "#F7F4D5" : "#1a1a1a",
        border: isUser ? "none" : "1px solid #e8e4ce",
        borderRadius: isUser ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
        padding: "12px 16px",
        fontSize: 14,
      }}>
        {isUser ? (
          <p style={{ margin: 0, lineHeight: 1.6 }}>{message.content}</p>
        ) : (
          <div>{formatContent(message.content)}</div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Build context from user profile
  const profileContext = [
    profile?.current_job_role && `Current role: ${profile.current_job_role}`,
    profile?.target_role && `Target role: ${profile.target_role}`,
    profile?.years_experience && `Years experience: ${profile.years_experience}`,
    profile?.industry && `Industry: ${profile.industry}`,
    profile?.location && `Location: ${profile.location}`,
    profile?.current_salary && `Current salary: ₹${(profile.current_salary / 100000).toFixed(1)}L`,
    profile?.target_salary && `Target salary: ₹${(profile.target_salary / 100000).toFixed(1)}L`,
    profile?.skills?.length && `Skills: ${profile.skills.slice(0, 5).join(", ")}`,
  ].filter(Boolean).join("\n");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, profileContext }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.response }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Sorry, something went wrong. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isFirstMessage = messages.length === 0;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", height: "calc(100vh - 56px)" }}>

      {/* ── Header ── */}
      <div style={{ padding: "20px 0 16px", borderBottom: "1px solid #e8e4ce", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "#0A3323", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            ✨
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#0A3323", margin: 0 }}>Career Assistant</h1>
            <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>Salary intel · Interview prep · Offer evaluation · Referral help</p>
          </div>
          {profileContext && (
            <div style={{ marginLeft: "auto", fontSize: 10, color: "#839958", backgroundColor: "#F7F4D5", border: "1px solid #e8e4ce", borderRadius: 8, padding: "4px 10px" }}>
              Using your profile ✓
            </div>
          )}
        </div>
      </div>

      {/* ── Messages area ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0" }}>

        {/* Welcome / quick prompts (shown only before first message) */}
        {isFirstMessage && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#0A3323", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                  ✨
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: "0 0 4px" }}>
                    Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}! I'm your career assistant.
                  </p>
                  <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.6 }}>
                    I know the Indian job market. Ask me about salary ranges, how to prep for interviews, whether an offer is fair, or how to reach out for a referral.
                    {profileContext && " I've loaded your profile so I can give you personalised advice."}
                  </p>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>Try asking</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {QUICK_PROMPTS.map(({ icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    backgroundColor: "#fff", border: "1px solid #e8e4ce",
                    borderRadius: 10, padding: "10px 14px",
                    fontSize: 13, fontWeight: 600, color: "#1a1a1a",
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    transition: "border-color 0.15s",
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#0A3323", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
              ✨
            </div>
            <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: "4px 14px 14px 14px", padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#839958", animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div style={{ borderTop: "1px solid #e8e4ce", padding: "14px 0 4px", flexShrink: 0 }}>
        {/* Follow-up chips (shown after first message) */}
        {!isFirstMessage && !loading && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {[
              "Give me a specific number",
              "How do I negotiate this?",
              "What should I ask in the interview?",
              "Rewrite more concisely",
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                style={{ fontSize: 11, color: "#839958", backgroundColor: "#F9F7EC", border: "1px solid #e8e4ce", borderRadius: 99, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your career..."
            rows={2}
            style={{
              flex: 1, fontSize: 14, border: "1px solid #e8e4ce", borderRadius: 12,
              padding: "10px 14px", resize: "none", fontFamily: "inherit",
              lineHeight: 1.6, outline: "none",
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: 10, flexShrink: 0,
              backgroundColor: input.trim() && !loading ? "#0A3323" : "#e8e4ce",
              color: input.trim() && !loading ? "#F7F4D5" : "#b0ab8c",
              border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
              fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
          >
            ↑
          </button>
        </div>
        <p style={{ fontSize: 10, color: "#b0ab8c", margin: "6px 0 0", textAlign: "center" }}>
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
