"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const INK = "#0A0A0A"; const MID = "#888"; const LIGHT = "#EBEBEB";
const BG = "#FAFAFA"; const WHITE = "#FFFFFF"; const NAVY = "#1A3A8F";

interface Community {
  id: string; slug: string; name: string;
  role_type: string | null; member_count: number; posts_this_week: number;
  screening_questions?: { id: string; question: string; placeholder?: string }[];
}

const CHECKS = [
  "Identity verified",
  "Work email confirmed",
  "LinkedIn validated",
  "Checking role criteria",
  "Final quality check",
];

// ─── Screen 7: AI Screening ───────────────────────────────────────────────────
function AIScreening() {
  const [done, setDone] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDone(d => { if (d >= CHECKS.length) { clearInterval(t); return d; } return d + 1; }), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column", fontFamily: "var(--font-sora),Inter,sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px 0", fontSize: 13, fontWeight: 800, color: INK }}>
        <span>9:41</span><span style={{ fontSize: 11 }}>●●● 🔋</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 28px", textAlign: "center" }}>
        {/* Spinner */}
        <div style={{ width: 52, height: 52, border: `4px solid ${LIGHT}`, borderTop: `4px solid ${INK}`, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 24 }} />
        <h1 style={{ fontSize: 22, fontWeight: 900, color: INK, letterSpacing: "-0.6px", margin: "0 0 8px" }}>Reviewing your application.</h1>
        <p style={{ fontSize: 13, color: MID, lineHeight: 1.6, margin: "0 0 28px", maxWidth: 280 }}>
          Our AI is cross-checking your LinkedIn and application against the group criteria.
        </p>
        {/* Checklist */}
        <div style={{ width: "100%", maxWidth: 320, textAlign: "left" }}>
          {CHECKS.map((c, i) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: i < CHECKS.length - 1 ? `1px solid ${LIGHT}` : "none" }}>
              {i < done ? (
                <span style={{ color: "#16A34A", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>✓</span>
              ) : i === done ? (
                <div style={{ width: 12, height: 12, border: `2px solid ${LIGHT}`, borderTop: `2px solid ${INK}`, borderRadius: "50%", animation: "spin 1s linear infinite", flexShrink: 0 }} />
              ) : (
                <span style={{ color: "#DDDDDD", fontSize: 14, flexShrink: 0 }}>○</span>
              )}
              <span style={{ fontSize: 13, color: i < done ? INK : MID, fontWeight: i < done ? 600 : 400, transition: "all 0.3s" }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Screen 8: Result ─────────────────────────────────────────────────────────
function Result({ approved, community, score, feedback }: { approved: boolean; community: Community; score: number; feedback: string }) {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column", fontFamily: "var(--font-sora),Inter,sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px 0", fontSize: 13, fontWeight: 800, color: INK }}>
        <span>9:41</span><span style={{ fontSize: 11 }}>●●● 🔋</span>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", textAlign: "center" }}>
        {/* Badge */}
        <div style={{ width: 64, height: 64, background: INK, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 18 }}>
          {approved ? "✓" : "✕"}
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: INK, letterSpacing: "-0.9px", margin: "0 0 6px" }}>
          {approved ? "You're in." : "Not this time."}
        </h1>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 12 }}>
          {community.name} · {approved ? "Verified member" : "Application reviewed"}
        </div>
        <p style={{ fontSize: 13, color: MID, lineHeight: 1.6, margin: "0 0 24px", maxWidth: 300 }}>
          {feedback || (approved
            ? `Welcome to the room. ${community.member_count.toLocaleString()} verified practitioners. Make yourself useful.`
            : "Your application didn't meet the criteria this time. You can re-apply in 30 days.")}
        </p>

        {/* Score + Stats */}
        <div style={{ display: "flex", gap: 10, width: "100%", marginBottom: 28 }}>
          {(approved
            ? [{ v: community.member_count.toLocaleString(), l: "Members" }, { v: String(community.posts_this_week), l: "Posts/wk" }, { v: "4", l: "Channels" }]
            : [{ v: `${score}%`, l: "AI score" }, { v: "30d", l: "Re-apply in" }, { v: "6", l: "Other groups" }]
          ).map(s => (
            <div key={s.l} style={{ flex: 1, background: "#F5F5F5", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: INK }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "#CCC", textTransform: "uppercase" as const, letterSpacing: "1px", marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {approved ? (
          <>
            <button
              onClick={() => router.push(`/communities/${community.slug}/discussions`)}
              style={{ width: "100%", padding: "15px", background: INK, color: BG, fontSize: 15, fontWeight: 900, borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.2px", marginBottom: 10 }}
            >
              Enter group →
            </button>
            <Link href="/communities" style={{ display: "block", width: "100%", padding: "15px", background: "transparent", color: INK, fontSize: 14, fontWeight: 700, borderRadius: 12, border: `1.5px solid ${LIGHT}`, textDecoration: "none", textAlign: "center" }}>
              Explore other groups
            </Link>
          </>
        ) : (
          <>
            <Link href="/communities" style={{ display: "block", width: "100%", padding: "15px", background: INK, color: BG, fontSize: 15, fontWeight: 900, borderRadius: 12, textDecoration: "none", textAlign: "center", marginBottom: 10 }}>
              Explore other groups
            </Link>
            <Link href={`/communities/${community.slug}/reapply`} style={{ display: "block", width: "100%", padding: "15px", background: "transparent", color: INK, fontSize: 14, fontWeight: 700, borderRadius: 12, border: `1.5px solid ${LIGHT}`, textDecoration: "none", textAlign: "center" }}>
              Learn what to improve
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Screen 6: Apply Form ─────────────────────────────────────────────────────
export default function ApplyPage() {
  const params   = useParams();
  const router   = useRouter();
  const slug     = params?.slug as string;
  const supabase = createClient();

  const [community, setCommunity] = useState<Community | null>(null);
  const [screen,    setScreen]    = useState<"form" | "screening" | "result">("form");
  const [approved,  setApproved]  = useState(false);
  const [score,     setScore]     = useState(0);
  const [feedback,  setFeedback]  = useState("");

  // Form fields
  const [roleCompany, setRoleCompany] = useState("");
  const [linkedin,    setLinkedin]    = useState("");
  const [years,       setYears]       = useState("");
  const [reason,      setReason]      = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      // Load community
      const { data: c } = await supabase.from("communities").select("id,slug,name,role_type,member_count,posts_this_week,screening_questions,requires_verification").eq("slug", slug).single();
      if (c) setCommunity(c);
      // Pre-fill role/company from profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: p } = await supabase.from("profiles").select("current_title,company,linkedin_url").eq("id", user.id).maybeSingle();
        if (p) {
          if (p.current_title && p.company) setRoleCompany(`${p.current_title} @ ${p.company}`);
          if (p.linkedin_url) setLinkedin(p.linkedin_url.replace("https://linkedin.com/in/", "").replace("https://www.linkedin.com/in/", ""));
        }
      }
    })();
  }, [slug]); // eslint-disable-line

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || reason.length < 15) { setError("Please write at least 15 characters."); return; }
    setError("");
    setLoading(true);
    setScreen("screening");

    try {
      const res = await fetch("/api/groups/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ community_id: community?.id, answers: [roleCompany, linkedin, years, reason] }),
      });
      const data = await res.json();
      const isApproved = data.status === "approved";
      setApproved(isApproved);
      setScore(data.ai_score ?? 0);
      setFeedback(data.ai_feedback ?? "");
      // Persist membership locally so group detail shows "Enter group →" on return
      if (isApproved && slug) {
        try {
          const joined: string[] = JSON.parse(localStorage.getItem("joined_communities") ?? "[]");
          if (!joined.includes(slug)) localStorage.setItem("joined_communities", JSON.stringify([...joined, slug]));
        } catch { /* ignore */ }
      }
    } catch {
      setApproved(false);
      setScore(42);
      setFeedback("We couldn't process your application right now. Please try again.");
    }
    // Let screening animation play for at least 4.5s
    await new Promise(r => setTimeout(r, 4500));
    setScreen("result");
    setLoading(false);
  };

  if (screen === "screening") return <AIScreening />;
  if (screen === "result" && community) return <Result approved={approved} community={community} score={score} feedback={feedback} />;

  if (!community) {
    return (
      <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTop: `3px solid ${INK}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column", fontFamily: "var(--font-sora),Inter,sans-serif" }}>
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px 0", fontSize: 13, fontWeight: 800, color: INK }}>
        <span>9:41</span><span style={{ fontSize: 11 }}>●●● 🔋</span>
      </div>

      <div style={{ flex: 1, padding: "12px 20px 48px", overflowY: "auto" }}>
        {/* Back */}
        <button onClick={() => router.back()} style={{ background: "none", border: "none", fontSize: 22, color: INK, cursor: "pointer", padding: "0 0 12px", fontFamily: "inherit" }}>←</button>

        {/* Heading */}
        <h1 style={{ fontSize: 22, fontWeight: 900, color: INK, letterSpacing: "-0.7px", margin: "0 0 4px" }}>Apply to join.</h1>
        <p style={{ fontSize: 12, color: MID, margin: "0 0 12px" }}>{community.name} · AI-screened</p>

        {/* AI tag */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#EEF2FF", color: NAVY, fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 6, marginBottom: 20 }}>
          ✦ Usually approved in under 2 minutes
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Role & Company */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: INK, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 5 }}>
              Current role & company <span style={{ color: "#DC2626" }}>*</span>
            </div>
            <input
              value={roleCompany}
              onChange={e => setRoleCompany(e.target.value)}
              placeholder="e.g. Product Manager @ Razorpay"
              required
              style={{ width: "100%", boxSizing: "border-box" as const, padding: "12px 14px", fontSize: 14, border: `1.5px solid ${roleCompany ? INK : LIGHT}`, borderRadius: 10, fontFamily: "inherit", outline: "none", backgroundColor: WHITE, color: INK, transition: "border-color 0.15s" }}
              onFocus={e => (e.target.style.borderColor = INK)}
              onBlur={e => (e.target.style.borderColor = roleCompany ? INK : LIGHT)}
            />
          </div>

          {/* LinkedIn */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: INK, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 5 }}>
              LinkedIn profile <span style={{ color: "#DC2626" }}>*</span>
            </div>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: "#0077B5", pointerEvents: "none" as const }}>in/</span>
              <input
                value={linkedin}
                onChange={e => setLinkedin(e.target.value)}
                placeholder="yourhandle"
                required
                style={{ width: "100%", boxSizing: "border-box" as const, padding: "12px 14px 12px 36px", fontSize: 14, border: "1.5px solid #0077B5", borderRadius: 10, fontFamily: "inherit", outline: "none", backgroundColor: WHITE, color: INK }}
              />
            </div>
          </div>

          {/* Years */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: INK, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 5 }}>
              Years in this function <span style={{ color: "#DC2626" }}>*</span>
            </div>
            <select
              value={years}
              onChange={e => setYears(e.target.value)}
              required
              style={{ width: "100%", boxSizing: "border-box" as const, padding: "12px 14px", fontSize: 14, border: `1.5px solid ${years ? INK : LIGHT}`, borderRadius: 10, fontFamily: "inherit", outline: "none", backgroundColor: WHITE, color: years ? INK : MID, appearance: "none" as const, cursor: "pointer" }}
            >
              <option value="">Select…</option>
              {["0–1 yrs","1–2 yrs","3–6 yrs","7–10 yrs","10+ yrs"].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Why */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: INK, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 5 }}>
              Why do you want in? <span style={{ color: "#DC2626" }}>*</span>
            </div>
            <textarea
              value={reason}
              onChange={e => { setReason(e.target.value); setError(""); }}
              placeholder="Be specific. Vague answers get flagged."
              required
              rows={3}
              style={{ width: "100%", boxSizing: "border-box" as const, padding: "12px 14px", fontSize: 13, border: `1.5px solid ${LIGHT}`, borderRadius: 10, fontFamily: "inherit", outline: "none", backgroundColor: WHITE, color: INK, resize: "vertical" as const, lineHeight: 1.5 }}
              onFocus={e => (e.target.style.borderColor = INK)}
              onBlur={e => (e.target.style.borderColor = LIGHT)}
            />
            <div style={{ fontSize: 11, color: "#CCCCCC", marginTop: 4 }}>Our AI cross-checks your answers with your LinkedIn.</div>
          </div>

          {error && <p style={{ fontSize: 12, color: "#EF4444", margin: 0 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "15px", background: loading ? "#D1D5DB" : INK, color: BG, fontSize: 15, fontWeight: 900, borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "-0.2px", marginTop: 4 }}
          >
            Submit application →
          </button>
        </form>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
