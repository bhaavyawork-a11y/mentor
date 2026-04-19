"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const FUNCTIONS   = ["Operations", "Product", "Engineering", "Marketing", "Data", "Design", "Sales", "Finance", "Consulting", "Other"];
const EXPERIENCES = ["0–2 yrs", "3–6 yrs", "7–10 yrs", "10+ yrs"];
const INK = "#0A0A0A"; const MID = "#888"; const LIGHT = "#EBEBEB"; const BG = "#FAFAFA"; const WHITE = "#FFFFFF"; const NAVY = "#1A3A8F";

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep]       = useState(0);
  const [title, setTitle]     = useState("");
  const [company, setCompany] = useState("");
  const [fn, setFn]           = useState("");
  const [exp, setExp]         = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState("there");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const n = data.user?.user_metadata?.full_name ?? data.user?.email ?? "there";
      setUserName(n.split(" ")[0]);
    });
  }, []);// eslint-disable-line

  const handleNext = async () => {
    if (step === 0) { if (!title || !company || !fn || !exp) return; setStep(1); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name ?? "",
        current_title: title, company, function: fn,
        years_experience: exp, linkedin_url: linkedin, onboarding_complete: true,
      });
    }
    router.push("/communities");
  };

  const dots = [{ done: true }, { done: step >= 0, active: step === 0 }, { done: step >= 1, active: step === 1 }];
  const canContinue = step === 0 ? !!(title && company && fn && exp) : true;

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: BG, display: "flex", flexDirection: "column", fontFamily: "var(--font-sora), Inter, sans-serif" }}>
      {/* Status bar */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px 4px", fontSize: 13, fontWeight: 800, color: INK }}>
        <span>9:41</span><span style={{ fontSize: 11 }}>●●● 🔋</span>
      </div>
      <div style={{ flex: 1, padding: "12px 20px 48px", overflowY: "auto" }}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 5, marginBottom: 20 }}>
          {dots.map((d, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: d.done && !d.active ? INK : d.active ? NAVY : LIGHT }} />
          ))}
        </div>

        {step === 0 && <>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: INK, letterSpacing: "-0.7px", margin: "0 0 4px" }}>Your role.</h1>
          <p style={{ fontSize: 12, color: MID, margin: "0 0 20px" }}>Determines which groups you can apply to.</p>

          <div style={{ fontSize: 10, fontWeight: 700, color: INK, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 5 }}>Current title</div>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Chief of Staff"
            style={{ width: "100%", boxSizing: "border-box" as const, padding: "12px 14px", fontSize: 14, border: `1.5px solid ${LIGHT}`, borderRadius: 10, fontFamily: "inherit", outline: "none", backgroundColor: WHITE, color: INK, marginBottom: 14, transition: "border-color 0.15s" }}
            onFocus={e => (e.target.style.borderColor = INK)} onBlur={e => (e.target.style.borderColor = LIGHT)} />

          <div style={{ fontSize: 10, fontWeight: 700, color: INK, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 5 }}>Company</div>
          <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Startup (Stealth)"
            style={{ width: "100%", boxSizing: "border-box" as const, padding: "12px 14px", fontSize: 14, border: `1.5px solid ${LIGHT}`, borderRadius: 10, fontFamily: "inherit", outline: "none", backgroundColor: WHITE, color: INK, marginBottom: 14, transition: "border-color 0.15s" }}
            onFocus={e => (e.target.style.borderColor = INK)} onBlur={e => (e.target.style.borderColor = LIGHT)} />

          <div style={{ fontSize: 10, fontWeight: 700, color: INK, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 8 }}>Function</div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 18 }}>
            {FUNCTIONS.map(f => (
              <button key={f} onClick={() => setFn(f)} style={{ padding: "6px 13px", borderRadius: 99, border: `1.5px solid ${fn === f ? INK : LIGHT}`, background: fn === f ? INK : "transparent", color: fn === f ? BG : MID, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}>{f}</button>
            ))}
          </div>

          <div style={{ fontSize: 10, fontWeight: 700, color: INK, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 8 }}>Experience</div>
          <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 28 }}>
            {EXPERIENCES.map(e => (
              <button key={e} onClick={() => setExp(e)} style={{ padding: "6px 13px", borderRadius: 99, border: `1.5px solid ${exp === e ? INK : LIGHT}`, background: exp === e ? INK : "transparent", color: exp === e ? BG : MID, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}>{e}</button>
            ))}
          </div>
        </>}

        {step === 1 && <>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: INK, letterSpacing: "-0.7px", margin: "0 0 4px" }}>Almost there, {userName}.</h1>
          <p style={{ fontSize: 12, color: MID, margin: "0 0 20px" }}>Link your LinkedIn so members can recognise you.</p>
          <div style={{ fontSize: 10, fontWeight: 700, color: INK, textTransform: "uppercase" as const, letterSpacing: "1px", marginBottom: 5 }}>LinkedIn (optional)</div>
          <div style={{ position: "relative", marginBottom: 20 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: "#0077B5", pointerEvents: "none" as const }}>in/</span>
            <input type="text" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="yourhandle"
              style={{ width: "100%", boxSizing: "border-box" as const, padding: "12px 14px 12px 36px", fontSize: 14, border: "1.5px solid #0077B5", borderRadius: 10, fontFamily: "inherit", outline: "none", backgroundColor: WHITE, color: INK }} />
          </div>
          <div style={{ background: WHITE, border: `1.5px solid ${LIGHT}`, borderRadius: 14, padding: "16px", marginBottom: 28 }}>
            <p style={{ fontSize: 10, color: MID, margin: "0 0 6px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "1px" }}>Your profile</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 2px" }}>{title}</p>
            <p style={{ fontSize: 13, color: MID, margin: "0 0 10px" }}>{company}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
              {fn && <span style={{ fontSize: 11, padding: "3px 10px", border: `1.5px solid ${LIGHT}`, borderRadius: 99, color: MID, fontWeight: 600 }}>{fn}</span>}
              {exp && <span style={{ fontSize: 11, padding: "3px 10px", border: `1.5px solid ${LIGHT}`, borderRadius: 99, color: MID, fontWeight: 600 }}>{exp}</span>}
            </div>
          </div>
        </>}

        <button onClick={handleNext} disabled={loading || !canContinue}
          style={{ width: "100%", padding: "15px", background: (!loading && canContinue) ? INK : "#D1D5DB", color: BG, fontSize: 15, fontWeight: 900, borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: "-0.2px" }}>
          {loading ? "Saving…" : step === 0 ? "Next →" : "Explore groups →"}
        </button>
      </div>
    </div>
  );
}
