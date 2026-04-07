"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const EXPERTISE_OPTIONS = [
  "Software Engineering", "Product Management", "Data Science", "Design (UX/UI)",
  "Finance & Investing", "Consulting", "Sales & GTM", "Marketing", "Operations",
  "Startups & Entrepreneurship", "Career Pivots", "MBA Prep", "FAANG Interviews",
  "Salary Negotiation", "Leadership", "Analytics",
];

const INDUSTRY_OPTIONS = [
  "Technology", "Finance & Banking", "Consulting", "E-commerce", "Healthcare",
  "EdTech", "Fintech", "SaaS", "Consumer Internet", "Deep Tech", "Media",
  "FMCG", "Manufacturing", "Government / Public Sector",
];

interface FormState {
  full_name: string; headline: string; bio: string; linkedin_url: string;
  years_experience: string; expertise_areas: string[]; industries: string[];
}

export default function ExpertProfilePage() {
  const supabase = createClient();
  const router   = useRouter();

  const [form, setForm] = useState<FormState>({
    full_name: "", headline: "", bio: "", linkedin_url: "",
    years_experience: "0", expertise_areas: [], industries: [],
  });
  const [expertId, setExpertId]   = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data } = await supabase
        .from("experts")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (data) {
        setExpertId(data.id);
        setForm({
          full_name:       data.full_name ?? "",
          headline:        data.headline ?? "",
          bio:             data.bio ?? "",
          linkedin_url:    data.linkedin_url ?? "",
          years_experience: String(data.years_experience ?? 0),
          expertise_areas: data.expertise_areas ?? [],
          industries:      data.industries ?? [],
        });
      } else {
        // Pre-fill name from user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, linkedin_url")
          .eq("id", session.user.id)
          .single();
        if (profile) setForm(f => ({ ...f, full_name: profile.full_name ?? "", linkedin_url: profile.linkedin_url ?? "" }));
      }
      setLoading(false);
    })();
  }, [supabase, router]);

  const toggle = (field: "expertise_areas" | "industries", value: string) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(x => x !== value)
        : [...f[field], value],
    }));
  };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/expert/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, years_experience: parseInt(form.years_experience) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      if (!expertId && json.id) setExpertId(json.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}><p style={{ color: "#839958" }}>Loading…</p></div>;

  const field = (label: string, key: keyof FormState, type: "text" | "url" | "number" | "textarea" = "text", placeholder = "") => (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A3323", marginBottom: 6 }}>{label}</label>
      {type === "textarea" ? (
        <textarea
          value={form[key] as string}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          rows={4}
          style={{
            width: "100%", boxSizing: "border-box", border: "1px solid #e8e4ce",
            borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit",
            backgroundColor: "#fff", outline: "none", resize: "vertical", color: "#1a1a1a",
          }}
        />
      ) : (
        <input
          type={type}
          value={form[key] as string}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          min={type === "number" ? 0 : undefined}
          max={type === "number" ? 40 : undefined}
          style={{
            width: "100%", boxSizing: "border-box", border: "1px solid #e8e4ce",
            borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit",
            backgroundColor: "#fff", outline: "none", color: "#1a1a1a",
          }}
        />
      )}
    </div>
  );

  const chipGroup = (label: string, options: string[], field: "expertise_areas" | "industries") => (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0A3323", marginBottom: 8 }}>{label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map(opt => {
          const active = form[field].includes(opt);
          return (
            <button key={opt} onClick={() => toggle(field, opt)} style={{
              padding: "6px 14px", borderRadius: 99, fontSize: 12, cursor: "pointer",
              fontWeight: active ? 700 : 500, fontFamily: "inherit",
              backgroundColor: active ? "#0A3323" : "#f5f5f0",
              color: active ? "#839958" : "#555",
              border: "none", transition: "all 0.12s",
            }}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 32, maxWidth: 680 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0A3323", margin: "0 0 4px" }}>
          {expertId ? "My Profile" : "Create Expert Profile"}
        </h1>
        <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>
          This is what mentees see when browsing experts.
        </p>
      </div>

      <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 16, padding: "28px 28px 24px" }}>
        {field("Full name", "full_name", "text", "Your full name")}
        {field("Headline", "headline", "text", "e.g. Senior PM at Swiggy · Ex-BCG · IIT Delhi")}
        {field("Bio", "bio", "textarea", "Tell mentees about your background, what you're good at, and how you can help them…")}
        {field("LinkedIn URL", "linkedin_url", "url", "https://linkedin.com/in/yourprofile")}
        {field("Years of experience", "years_experience", "number")}

        {chipGroup("Areas of expertise", EXPERTISE_OPTIONS, "expertise_areas")}
        {chipGroup("Industries", INDUSTRY_OPTIONS, "industries")}

        {error && (
          <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 14, backgroundColor: "#fee2e2", padding: "8px 12px", borderRadius: 8 }}>{error}</p>
        )}

        <button onClick={save} disabled={saving || !form.full_name} style={{
          backgroundColor: saving ? "#839958" : "#0A3323", color: "#F7F4D5",
          border: "none", borderRadius: 12, padding: "12px 28px",
          fontSize: 13, fontWeight: 800, cursor: saving || !form.full_name ? "default" : "pointer",
          opacity: !form.full_name ? 0.6 : 1,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {saving ? "Saving…" : saved ? "✓ Saved!" : expertId ? "Save changes" : "Create profile →"}
        </button>
      </div>
    </div>
  );
}
