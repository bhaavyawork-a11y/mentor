"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { X, Plus, Save, Loader2 } from "lucide-react";
import type { Profile } from "@/types";

const INDUSTRIES = ["Technology","Finance","Healthcare","Education","Consulting","Media","Retail","Manufacturing","Legal","Government","Other"];

const CAREER_ACTIONS = [
  { key: "post_created",    label: "Posts & discussions", icon: "💬" },
  { key: "referral_post",   label: "Referrals shared",   icon: "🤝" },
  { key: "job_application", label: "Jobs applied to",    icon: "💼" },
  { key: "intro_requested", label: "Peer intros made",   icon: "👋" },
  { key: "invite_sent",     label: "Invites sent",       icon: "✉️" },
];

export default function ProfileForm({ profile, userId, memberSince, groupCount, postCount, eventCounts }: {
  profile: Profile | null;
  userId: string;
  memberSince?: string;
  groupCount?: number;
  postCount?: number;
  eventCounts?: Record<string, number>;
}) {
  const router   = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const [form, setForm] = useState({
    full_name:        profile?.full_name ?? "",
    bio:              profile?.bio ?? "",
    location:         profile?.location ?? "",
    linkedin_url:     profile?.linkedin_url ?? "",
    current_job_role:     profile?.current_job_role ?? "",
    target_role:      profile?.target_role ?? "",
    industry:         profile?.industry ?? "",
    years_experience: profile?.years_experience ?? 0,
    current_salary:   profile?.current_salary ?? "" as string | number,
    target_salary:    profile?.target_salary ?? "" as string | number,
    skills:           profile?.skills ?? [] as string[],
  });

  const addSkill = () => {
    const t = skillInput.trim();
    if (t && !form.skills.includes(t)) { setForm((f) => ({ ...f, skills: [...f.skills, t] })); setSkillInput(""); }
  };

  const removeSkill = (s: string) => setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    await supabase.from("profiles").upsert({
      id: userId, email: profile?.email ?? "", ...form,
      current_salary: form.current_salary ? Number(form.current_salary) : null,
      target_salary:  form.target_salary  ? Number(form.target_salary)  : null,
      years_experience: Number(form.years_experience),
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500); router.refresh();
  };

  const card = { backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: "16px", padding: "24px", marginBottom: "0" };

  return (
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      <Section title="Personal Info" style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Field label="Full name"><input className="input" value={form.full_name} placeholder="Ada Lovelace" onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} /></Field>
          <Field label="Location"><input className="input" value={form.location} placeholder="San Francisco, CA" onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></Field>
        </div>
        <Field label="Bio"><textarea className="input" style={{ resize: "none" }} rows={3} value={form.bio} placeholder="A short bio about your career and goals…" onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} /></Field>
        <Field label="LinkedIn URL"><input className="input" value={form.linkedin_url} placeholder="https://linkedin.com/in/your-handle" onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} /></Field>
      </Section>

      <Section title="Career" style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Field label="Current role"><input className="input" value={form.current_job_role} placeholder="Senior Engineer" onChange={(e) => setForm((f) => ({ ...f, current_job_role: e.target.value }))} /></Field>
          <Field label="Target role"><input className="input" value={form.target_role} placeholder="Engineering Manager" onChange={(e) => setForm((f) => ({ ...f, target_role: e.target.value }))} /></Field>
          <Field label="Industry">
            <select className="input" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}>
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Years of experience"><input type="number" min={0} max={50} className="input" value={form.years_experience} onChange={(e) => setForm((f) => ({ ...f, years_experience: Number(e.target.value) }))} /></Field>
        </div>
      </Section>

      <Section title="Compensation" style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
          <Field label="Current salary (USD / yr)"><input type="number" className="input" value={form.current_salary} placeholder="120000" onChange={(e) => setForm((f) => ({ ...f, current_salary: e.target.value }))} /></Field>
          <Field label="Target salary (USD / yr)"><input type="number" className="input" value={form.target_salary} placeholder="160000" onChange={(e) => setForm((f) => ({ ...f, target_salary: e.target.value }))} /></Field>
        </div>
      </Section>

      {/* ── Career Activity (North Star metric) ── */}
      {eventCounts !== undefined && (
        <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: "16px", padding: "20px 24px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 6px" }}>
                Career actions this month
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: "32px", fontWeight: 800, color: "#93B4FF", lineHeight: 1 }}>
                  {Object.values(eventCounts).reduce((a, b) => a + b, 0)}
                </span>
                <span style={{ fontSize: "13px", color: "#6B7280" }}>actions in last 30 days</span>
              </div>
            </div>
            <div style={{ fontSize: "10px", color: "#374151", fontWeight: 600, textAlign: "right" }}>
              LAST 30 DAYS
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CAREER_ACTIONS.map(({ key, label, icon }) => {
              const count = eventCounts[key] ?? 0;
              const maxCount = Math.max(...CAREER_ACTIONS.map(a => eventCounts[a.key] ?? 0), 1);
              const barWidth = count > 0 ? Math.max((count / maxCount) * 100, 6) : 0;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 14, flexShrink: 0, width: 20 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: count > 0 ? "#F9FAFB" : "#374151" }}>{count}</span>
                    </div>
                    <div style={{ height: 3, backgroundColor: "#1F2937", borderRadius: 99, overflow: "hidden" }}>
                      {barWidth > 0 && (
                        <div style={{
                          height: "100%", borderRadius: 99,
                          width: `${barWidth}%`,
                          backgroundColor: "#1A3A8F",
                          transition: "width 0.4s ease",
                        }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Context bar */}
          <div style={{
            marginTop: 18, paddingTop: 14, borderTop: "1px solid #1F2937",
            display: "flex", gap: 24,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#F9FAFB" }}>{memberSince || "—"}</div>
              <div style={{ fontSize: "10px", color: "#6B7280", marginTop: 2 }}>Member since</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#F9FAFB" }}>{groupCount ?? 0}</div>
              <div style={{ fontSize: "10px", color: "#6B7280", marginTop: 2 }}>Groups</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#F9FAFB" }}>{postCount ?? 0}</div>
              <div style={{ fontSize: "10px", color: "#6B7280", marginTop: 2 }}>Total posts</div>
            </div>
          </div>
        </div>
      )}

      <Section title="Skills" style={card}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input className="input" style={{ flex: 1 }} value={skillInput} placeholder="Type a skill and press Enter"
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} />
          <button type="button" onClick={addSkill} className="btn-outline" style={{ flexShrink: 0, padding: "0 14px" }}>
            <Plus style={{ width: "14px", height: "14px" }} />
          </button>
        </div>
        {form.skills.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
            {form.skills.map((skill) => (
              <span key={skill} style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                backgroundColor: "rgba(26,58,143,0.2)", color: "#F9FAFB",
                fontSize: "11px", fontWeight: 600,
                borderRadius: "99px", padding: "4px 10px",
              }}>
                {skill}
                <button type="button" onClick={() => removeSkill(skill)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", color: "#1a1a1a88" }}>
                  <X style={{ width: "10px", height: "10px" }} />
                </button>
              </span>
            ))}
          </div>
        )}
      </Section>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button type="submit" disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>
          {saving ? <Loader2 style={{ width: "14px", height: "14px" }} /> : <Save style={{ width: "14px", height: "14px" }} />}
          {saving ? "Saving…" : "Save profile"}
        </button>
        {saved && <span style={{ fontSize: "13px", fontWeight: 600, color: "#6B7280" }}>✓ Saved!</span>}
      </div>
    </form>
  );
}

function Section({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ ...style, display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ paddingBottom: "10px", borderBottom: "1px solid #1F2937" }}>
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#F9FAFB", margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
