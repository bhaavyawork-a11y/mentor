"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useProfile } from "@/hooks/useProfile";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── Quick prompts ────────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { icon: "💰", label: "Salary intel",       prompt: "What's a competitive salary range for my role and experience level in India right now?" },
  { icon: "🎯", label: "Interview prep",     prompt: "Give me the top 10 interview questions for my target role and exactly how to answer them." },
  { icon: "📋", label: "Evaluate an offer",  prompt: "Help me evaluate a job offer — what should I look at beyond just the base salary?" },
  { icon: "🤝", label: "Ask for a referral", prompt: "Write me a short, non-awkward LinkedIn message to ask someone for a job referral." },
  { icon: "📝", label: "Resume review",      prompt: "What are the most common resume mistakes for early-career professionals in India, and how do I fix them?" },
  { icon: "💬", label: "Negotiate salary",   prompt: "How do I negotiate a higher salary without seeming greedy? Give me scripts I can actually use." },
];

// ─── Markdown renderer (bold + bullet lists + line breaks) ───────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) { elements.push(<div key={key++} style={{ height: 6 }} />); continue; }

    const isBullet = /^(\s*[-*•]|\s*\d+\.) /.test(line);
    const cleanLine = line.replace(/^(\s*[-*•]|\s*\d+\.) /, "").trim();

    // Parse inline bold **text**
    const parts = cleanLine.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j} style={{ color: "inherit" }}>{part}</strong> : part
    );

    if (isBullet) {
      elements.push(
        <div key={key++} style={{ display: "flex", gap: 8, marginBottom: 4, paddingLeft: 4 }}>
          <span style={{ color: "#6B7280", flexShrink: 0, marginTop: 1 }}>•</span>
          <span style={{ lineHeight: 1.6 }}>{rendered}</span>
        </div>
      );
    } else if (/^###? /.test(line)) {
      const headingText = line.replace(/^###? /, "");
      elements.push(
        <p key={key++} style={{ fontSize: 13, fontWeight: 800, color: "#F9FAFB", margin: "10px 0 4px", textTransform: "uppercase", letterSpacing: "0.4px" }}>
          {headingText}
        </p>
      );
    } else {
      elements.push(
        <p key={key++} style={{ margin: "0 0 6px", lineHeight: 1.7 }}>{rendered}</p>
      );
    }
  }
  return elements;
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 16 }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          background: "linear-gradient(135deg, #080B14 0%, #1a5c3a 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, flexShrink: 0, marginRight: 10, marginTop: 2,
          boxShadow: "0 2px 8px rgba(10,51,35,0.25)",
        }}>
          ✨
        </div>
      )}
      <div style={{
        maxWidth: "78%",
        backgroundColor: isUser ? "#080B14" : "#fff",
        color: isUser ? "#F7F4D5" : "#1a1a1a",
        border: isUser ? "none" : "1px solid #1F2937",
        borderRadius: isUser ? "14px 14px 4px 14px" : "4px 14px 14px 14px",
        padding: "12px 16px",
        fontSize: 14,
        boxShadow: isUser ? "none" : "0 1px 6px rgba(0,0,0,0.04)",
      }}>
        {isUser ? (
          <p style={{ margin: 0, lineHeight: 1.6 }}>{message.content}</p>
        ) : (
          <div>
            {renderMarkdown(message.content)}
            {isStreaming && (
              <span style={{
                display: "inline-block", width: 2, height: 14,
                backgroundColor: "#5B8AFF", marginLeft: 2,
                animation: "blink 0.8s step-end infinite", verticalAlign: "middle",
              }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Typing indicator (three dots) ───────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "linear-gradient(135deg, #080B14 0%, #1a5c3a 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, flexShrink: 0,
      }}>
        ✨
      </div>
      <div style={{
        backgroundColor: "#181C24", border: "1px solid #1F2937",
        borderRadius: "4px 14px 14px 14px", padding: "14px 18px",
      }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: "50%", backgroundColor: "#5B8AFF",
              animation: "bounce 1.2s infinite", animationDelay: `${i * 0.2}s`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AssistantPage() {
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false); // before first token
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Profile context string
  const profileContext = [
    profile?.full_name       && `Name: ${profile.full_name}`,
    profile?.current_job_role && `Current role: ${profile.current_job_role}`,
    profile?.target_role     && `Target role: ${profile.target_role}`,
    profile?.years_experience && `Years of experience: ${profile.years_experience}`,
    profile?.industry        && `Industry: ${profile.industry}`,
    profile?.location        && `Location: ${profile.location}`,
    profile?.current_salary  && `Current salary: ₹${(profile.current_salary / 100000).toFixed(1)} LPA`,
    profile?.target_salary   && `Target salary: ₹${(profile.target_salary / 100000).toFixed(1)} LPA`,
    profile?.skills?.length  && `Skills: ${profile.skills.slice(0, 8).join(", ")}`,
    profile?.bio             && `About: ${profile.bio}`,
  ].filter(Boolean).join("\n");

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isWaiting, scrollToBottom]);

  const sendMessage = async (text?: string) => {
    const userText = (text ?? input).trim();
    if (!userText || isStreaming) return;

    // Cancel any previous stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: Message = { role: "user", content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsWaiting(true);
    setIsStreaming(false);

    // Auto-resize textarea back
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, profileContext }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({}));
        const msg = res.status === 401
          ? "Invalid API key — check GROQ_API_KEY in Vercel settings."
          : errData.detail || "API error — please try again.";
        throw new Error(msg);
      }

      // Start streaming
      setIsWaiting(false);
      setIsStreaming(true);

      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages([...newMessages, assistantMsg]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages([...newMessages, { role: "assistant", content: fullText }]);
        scrollToBottom();
      }

    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      setIsWaiting(false);
      setMessages([...newMessages, {
        role: "assistant",
        content: `Something went wrong — ${(err as Error).message || "please try again."}`,
      }]);
    } finally {
      setIsWaiting(false);
      setIsStreaming(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const isFirstMessage = messages.length === 0;
  const busy = isStreaming || isWaiting;

  return (
    <div className="page-chat">

      {/* ── Header ── */}
      <div style={{ padding: "20px 0 16px", borderBottom: "1px solid #1F2937", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, #080B14 0%, #1a5c3a 100%)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            boxShadow: "0 2px 10px rgba(10,51,35,0.2)",
          }}>
            ✨
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#F9FAFB", margin: 0 }}>Career Assistant</h1>
            <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
              Powered by Llama 3.3 70B · Salary · Interviews · Offers · Referrals
            </p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {isStreaming && (
              <span style={{ fontSize: 11, color: "#6B7280", backgroundColor: "rgba(26,58,143,0.2)", border: "1px solid #1F2937", borderRadius: 99, padding: "3px 10px", animation: "pulse 1.5s infinite" }}>
                ● Thinking…
              </span>
            )}
            {profileContext && !isStreaming && (
              <span style={{ fontSize: 10, color: "#6B7280", backgroundColor: "rgba(26,58,143,0.2)", border: "1px solid #1F2937", borderRadius: 8, padding: "4px 10px" }}>
                Profile loaded ✓
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0" }}>

        {/* Welcome screen */}
        {isFirstMessage && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #080B14 0%, #1a5c3a 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                }}>
                  ✨
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB", margin: "0 0 6px" }}>
                    Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}! I know the Indian job market inside-out.
                  </p>
                  <p style={{ fontSize: 13, color: "#9CA3AF", margin: 0, lineHeight: 1.7 }}>
                    Ask me about real salary numbers, how to crack interviews at specific companies, whether a job offer is fair, or how to reach out for a referral without being awkward.
                    {profileContext && " I've got your profile — so I'll tailor everything to your exact situation."}
                  </p>
                </div>
              </div>
            </div>

            <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 10px" }}>
              Try asking
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {QUICK_PROMPTS.map(({ icon, label, prompt }) => (
                <button
                  key={label}
                  onClick={() => sendMessage(prompt)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    backgroundColor: "#181C24", border: "1px solid #1F2937",
                    borderRadius: 10, padding: "11px 14px",
                    fontSize: 13, fontWeight: 600, color: "#F9FAFB",
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#080B14"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f9f9f7"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e8e4ce"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff"; }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message history */}
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
          />
        ))}

        {/* Waiting for first token */}
        {isWaiting && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div style={{ borderTop: "1px solid #1F2937", padding: "14px 0 4px", flexShrink: 0 }}>
        {/* Follow-up chips */}
        {!isFirstMessage && !busy && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {[
              "Give me a specific number",
              "How do I negotiate this?",
              "What should I say in the interview?",
              "Make it shorter and punchier",
              "What are the red flags here?",
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                style={{
                  fontSize: 11, color: "#6B7280", backgroundColor: "#0F1117",
                  border: "1px solid #1F2937", borderRadius: 99, padding: "4px 12px",
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
                }}
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
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
            }}
            onKeyDown={handleKeyDown}
            placeholder={busy ? "Thinking…" : "Ask anything about your career…"}
            disabled={busy}
            rows={2}
            style={{
              flex: 1, fontSize: 14,
              border: "1px solid #1F2937", borderRadius: 12,
              padding: "10px 14px", resize: "none", fontFamily: "inherit",
              lineHeight: 1.6, outline: "none", minHeight: 44, maxHeight: 140,
              backgroundColor: busy ? "#f9f9f7" : "#fff",
              color: "#F9FAFB", transition: "border-color 0.15s",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#080B14"; }}
            onBlur={(e) => { e.target.style.borderColor = "#e8e4ce"; }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || busy}
            style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              backgroundColor: input.trim() && !busy ? "#080B14" : "#e8e4ce",
              color: input.trim() && !busy ? "#F7F4D5" : "#b0ab8c",
              border: "none", cursor: input.trim() && !busy ? "pointer" : "default",
              fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            ↑
          </button>
        </div>
        <p style={{ fontSize: 10, color: "#6B7280", margin: "6px 0 0", textAlign: "center" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
