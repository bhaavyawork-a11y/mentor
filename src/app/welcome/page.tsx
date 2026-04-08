"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const STEPS = [
  { id: 1, emoji: "👤", title: "Tell us about yourself",  subtitle: "So we can personalise your experience" },
  { id: 2, emoji: "👥", title: "Join a community",         subtitle: "Find your people based on where you want to go" },
  { id: 3, emoji: "🚀", title: "You're all set!",          subtitle: "Here's what to explore first" },
];

const ROLE_OPTIONS = [
  "Software Engineer", "Product Manager", "Data Analyst / Scientist",
  "Designer (UX/UI)", "Business Analyst", "Consultant", "Finance / Banking",
  "Marketing", "Sales / GTM", "Operations", "Founder / Entrepreneur", "Other",
];

const GOAL_OPTIONS = [
  { emoji: "💼", label: "Get a better job",          value: "get_job"     },
  { emoji: "💰", label: "Negotiate a higher salary", value: "negotiate"   },
  { emoji: "🔄", label: "Switch industries",         value: "switch"      },
  { emoji: "🎤", label: "Crack my interviews",       value: "interviews"  },
  { emoji: "📈", label: "Get into a top company",    value: "top_company" },
  { emoji: "🌱", label: "Grow into leadership",      value: "leadership"  },
];

const COMMUNITIES = [
  { slug: "product",      emoji: "📦", name: "Product",         desc: "PMs, APMs, aspiring product folk"   },
  { slug: "engineering",  emoji: "⚙️",  name: "Engineering",     desc: "SWEs, devs, tech leads"             },
  { slug: "founders",     emoji: "🚀", name: "Founders Office", desc: "Builders, operators, 0→1 people"    },
  { slug: "finance",      emoji: "💹", name: "Finance",         desc: "Banking, PE, VC, consulting"        },
  { slug: "growth",       emoji: "📈", name: "Growth",          desc: "Marketing, sales, GTM"              },
  { slug: "data-ai",      emoji: "🤖", name: "Data & AI",       desc: "Data science, ML, analytics"        },
  { slug: "operations",   emoji: "🔧", name: "Operations",      desc: "Ops, strategy, chiefs of staff"     },
  { slug: "sales",        emoji: "🤝", name: "Sales & BD",      desc: "Revenue, partnerships, enterprise"  },
];

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "11px 14px",
  fontSize: 14, border: "1px solid #e8e4ce", borderRadius: 10,
  fontFamily: "inherit", outline: "none", backgroundColor: "#fff", color: "#1a1a1a",
};

// ─── Step 1 ───────────────────────────────────────────────────────────────────
function Step1({ name, setName, role, setRole, goal, setGoal }: {
  name: string; setName: (v: string) => void;
  role: string; setRole: (v: string) => void;
  goal: string; setGoal: (v: string) => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A3323", marginBottom: 6 }}>What should we call you?</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A3323", marginBottom: 6 }}>Current or target role</label>
        <select value={role} onChange={e => setRole(e.target.value)} style={{ ...inputStyle, appearance: "none" as const }}>
          <option value="">Pick a role…</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A3323", marginBottom: 10 }}>What&apos;s your main goal right now?</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {GOAL_OPTIONS.map(g => {
            const active = goal === g.value;
            return (
              <button key={g.value} onClick={() => setGoal(active ? "" : g.value)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
                borderRadius: 10, textAlign: "left",
                border: `1.5px solid ${active ? "#0A3323" : "#e8e4ce"}`,
                backgroundColor: active ? "#F7F4D5" : "#fff",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
              }}>
                <span style={{ fontSize: 18 }}>{g.emoji}</span>
                <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: "#1a1a1a", lineHeight: 1.3 }}>{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
function Step2({ chosen, setChosen }: { chosen: string[]; setChosen: (v: string[]) => void }) {
  const toggle = (slug: string) =>
    setChosen(chosen.includes(slug) ? chosen.filter(c => c !== slug) : [...chosen, slug]);
  return (
    <div>
      <p style={{ fontSize: 13, color: "#839958", margin: "0 0 16px" }}>Pick one or more — you can join more later.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {COMMUNITIES.map(c => {
          const active = chosen.includes(c.slug);
          return (
            <button key={c.slug} onClick={() => toggle(c.slug)} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
              borderRadius: 12, textAlign: "left",
              border: `1.5px solid ${active ? "#0A3323" : "#e8e4ce"}`,
              backgroundColor: active ? "#F7F4D5" : "#fff",
              cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{c.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: "#1a1a1a" }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "#839958" }}>{c.desc}</div>
              </div>
              {active && <span style={{ color: "#0A3323", fontSize: 16, flexShrink: 0 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────
function Step3({ name }: { name: string }) {
  const firstName = name.split(" ")[0] || "there";
  const actions = [
    { emoji: "✨", label: "Try the AI assistant", desc: "Real answers on salaries, offers, negotiation scripts.", href: "/assistant", cta: "Open assistant", highlight: true },
    { emoji: "📅", label: "Book a 1:1 with an expert", desc: "Mock interview, resume review, career coaching.", href: "/experts", cta: "Browse experts", highlight: false },
    { emoji: "💼", label: "Browse jobs", desc: "Curated roles from fast-growing companies across India.", href: "/jobs", cta: "See jobs", highlight: false },
  ];
  return (
    <div>
      <p style={{ fontSize: 14, color: "#555", margin: "0 0 20px", lineHeight: 1.6 }}>
        You&apos;re in, {firstName}! Here&apos;s what we&apos;d suggest doing first:
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {actions.map(a => (
          <Link key={a.href} href={a.href} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
            borderRadius: 14, textDecoration: "none",
            border: `1.5px solid ${a.highlight ? "#0A3323" : "#e8e4ce"}`,
            backgroundColor: a.highlight ? "#0A3323" : "#fff",
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{a.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: a.highlight ? "#F7F4D5" : "#1a1a1a", marginBottom: 2 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: a.highlight ? "#839958" : "#888", lineHeight: 1.4 }}>{a.desc}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#839958", flexShrink: 0 }}>{a.cta} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function WelcomePage() {
  const router   = useRouter();
  const supabase = createClient();

  const [step, setStep]         = useState(1);
  const [saving, setSaving]     = useState(false);
  const [userId, setUserId]     = useState<string | null>(null);
  const [name, setName]         = useState("");
  const [role, setRole]         = useState("");
  const [goal, setGoal]         = useState("");
  const [communities, setCommunities] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/auth/login"); return; }
      setUserId(session.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, current_job_role, onboarding_completed")
        .eq("id", session.user.id)
        .single();
      if (profile?.onboarding_completed) { router.replace("/feed"); return; }
      if (profile?.full_name)       setName(profile.full_name);
      if (profile?.current_job_role) setRole(profile.current_job_role);
    });
  }, [supabase, router]);

  const handleNext = async () => {
    if (step === 1) {
      if (!userId || !name) return;
      setSaving(true);
      await supabase.from("profiles").update({
        full_name: name, current_job_role: role || null, target_role: goal || null,
      }).eq("id", userId);
      setSaving(false);
      setStep(2);
    } else if (step === 2) {
      if (!userId) return;
      setSaving(true);
      if (communities.length > 0) {
        const { data: comms } = await supabase
          .from("communities").select("id, slug").in("slug", communities);
        if (comms?.length) {
          await supabase.from("community_members").upsert(
            comms.map(c => ({ community_id: c.id, user_id: userId, role: "member" })),
            { onConflict: "community_id,user_id", ignoreDuplicates: true }
          );
        }
      }
      await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", userId);
      setSaving(false);
      setStep(3);
    } else {
      router.push("/feed");
    }
  };

  const progress   = ((step - 1) / (STEPS.length - 1)) * 100;
  const current    = STEPS[step - 1];
  const canProceed = step === 1 ? !!name : true;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f3ea", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#0A3323" }}>
            mentor<span style={{ color: "#D3968C" }}>.</span>
          </span>
        </div>

        {/* Progress */}
        <div style={{ backgroundColor: "#e8e4ce", borderRadius: 99, height: 4, marginBottom: 24, overflow: "hidden" }}>
          <div style={{ height: "100%", backgroundColor: "#0A3323", borderRadius: 99, width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 24, justifyContent: "center" }}>
          {STEPS.map(s => (
            <div key={s.id} style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: s.id <= step ? "#0A3323" : "#e8e4ce", transition: "background 0.3s" }} />
          ))}
        </div>

        {/* Card */}
        <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 20, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "24px 28px 20px", borderBottom: "1px solid #e8e4ce" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{current.emoji}</div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0A3323", margin: "0 0 4px" }}>{current.title}</h1>
            <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>{current.subtitle}</p>
          </div>

          {/* Body */}
          <div style={{ padding: "24px 28px" }}>
            {step === 1 && <Step1 name={name} setName={setName} role={role} setRole={setRole} goal={goal} setGoal={setGoal} />}
            {step === 2 && <Step2 chosen={communities} setChosen={setCommunities} />}
            {step === 3 && <Step3 name={name} />}
          </div>

          {/* Footer */}
          <div style={{ padding: "16px 28px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {step > 1 && step < 3 ? (
              <button onClick={() => setStep(s => s - 1)} style={{ background: "none", border: "none", fontSize: 13, color: "#839958", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
                ← Back
              </button>
            ) : <div />}
            <button onClick={handleNext} disabled={saving || !canProceed} style={{
              backgroundColor: canProceed ? "#0A3323" : "#c8c4ae",
              color: "#F7F4D5", border: "none", borderRadius: 12,
              padding: "12px 28px", fontSize: 14, fontWeight: 800,
              cursor: canProceed && !saving ? "pointer" : "default",
              fontFamily: "inherit",
            }}>
              {saving ? "Saving…" : step === 3 ? "Go to my feed →" : step === 2 && communities.length === 0 ? "Skip →" : "Continue →"}
            </button>
          </div>
        </div>

        {step < 3 && (
          <p style={{ textAlign: "center", marginTop: 16 }}>
            <button onClick={() => router.push("/feed")} style={{ background: "none", border: "none", fontSize: 12, color: "#b0ab8c", cursor: "pointer", fontFamily: "inherit" }}>
              Skip setup, take me straight in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
