"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { X, Plus, Save, Loader2, User, Briefcase, DollarSign } from "lucide-react";
import type { Profile } from "@/types";

interface Props {
  profile: Profile | null;
  userId: string;
}

const INDUSTRIES = [
  "Technology","Finance","Healthcare","Education","Consulting",
  "Media","Retail","Manufacturing","Legal","Government","Other",
];

export default function ProfileForm({ profile, userId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
    current_role: profile?.current_role ?? "",
    target_role: profile?.target_role ?? "",
    industry: profile?.industry ?? "",
    years_experience: profile?.years_experience ?? 0,
    current_salary: profile?.current_salary ?? "" as string | number,
    target_salary: profile?.target_salary ?? "" as string | number,
    skills: profile?.skills ?? [] as string[],
  });

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !form.skills.includes(trimmed)) {
      setForm((f) => ({ ...f, skills: [...f.skills, trimmed] }));
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from("profiles").upsert({
      id: userId,
      email: profile?.email ?? "",
      ...form,
      current_salary: form.current_salary ? Number(form.current_salary) : null,
      target_salary: form.target_salary ? Number(form.target_salary) : null,
      years_experience: Number(form.years_experience),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="card space-y-4 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards", padding: "24px" }}>
        <SectionHeader icon={<User className="w-4 h-4" />} title="Personal Info" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Full name">
            <input className="input" value={form.full_name} placeholder="Ada Lovelace"
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <Field label="Location">
            <input className="input" value={form.location} placeholder="San Francisco, CA"
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </Field>
        </div>
        <Field label="Bio">
          <textarea className="input resize-none" rows={3} value={form.bio}
            placeholder="A short bio about your career and goals…"
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
        </Field>
        <Field label="LinkedIn URL">
          <input className="input" value={form.linkedin_url}
            placeholder="https://linkedin.com/in/your-handle"
            onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} />
        </Field>
      </div>

      <div className="card space-y-4 opacity-0 animate-fade-up animate-delay-100" style={{ animationFillMode: "forwards", padding: "24px" }}>
        <SectionHeader icon={<Briefcase className="w-4 h-4" />} title="Career" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Current role">
            <input className="input" value={form.current_role} placeholder="Senior Engineer"
              onChange={(e) => setForm((f) => ({ ...f, current_role: e.target.value }))} />
          </Field>
          <Field label="Target role">
            <input className="input" value={form.target_role} placeholder="Engineering Manager"
              onChange={(e) => setForm((f) => ({ ...f, target_role: e.target.value }))} />
          </Field>
          <Field label="Industry">
            <select className="input" value={form.industry}
              onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}>
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Years of experience">
            <input type="number" min={0} max={50} className="input" value={form.years_experience}
              onChange={(e) => setForm((f) => ({ ...f, years_experience: Number(e.target.value) }))} />
          </Field>
        </div>
      </div>

      <div className="card space-y-4 opacity-0 animate-fade-up animate-delay-200" style={{ animationFillMode: "forwards", padding: "24px" }}>
        <SectionHeader icon={<DollarSign className="w-4 h-4" />} title="Compensation" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Current salary (USD / yr)">
            <input type="number" className="input" value={form.current_salary} placeholder="120000"
              onChange={(e) => setForm((f) => ({ ...f, current_salary: e.target.value }))} />
          </Field>
          <Field label="Target salary (USD / yr)">
            <input type="number" className="input" value={form.target_salary} placeholder="160000"
              onChange={(e) => setForm((f) => ({ ...f, target_salary: e.target.value }))} />
          </Field>
        </div>
      </div>

      <div className="card space-y-4 opacity-0 animate-fade-up animate-delay-300" style={{ animationFillMode: "forwards", padding: "24px" }}>
        <SectionHeader icon={<Plus className="w-4 h-4" />} title="Skills" />
        <div className="flex gap-2">
          <input
            className="input flex-1" value={skillInput}
            placeholder="Type a skill and press Enter"
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
          />
          <button type="button" onClick={addSkill} className="btn-secondary shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {form.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {form.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium"
                style={{ background: "#EDE986", color: "#0f0f0f" }}
              >
                {skill}
                <button
                  type="button" onClick={() => removeSkill(skill)}
                  className="transition-opacity hover:opacity-50"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving…" : "Save profile"}
        </button>
        {saved && (
          <span className="text-[13px] font-medium animate-fade-in" style={{ color: "#F2619C" }}>
            ✓ Saved!
          </span>
        )}
      </div>
    </form>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3" style={{ borderBottom: "1.5px solid #f0f0f0" }}>
      <span style={{ color: "#0f0f0f66" }}>{icon}</span>
      <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#0f0f0f" }}>{title}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
