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
  "Technology","Finance","Healthcare","Education","Consulting","Media","Retail","Manufacturing","Legal","Government","Other",
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
      <div className="card p-6 space-y-4 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
        <SectionHeader icon={<User className="w-4 h-4" />} title="Personal Info" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Full name"><input className="input" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Ada Lovelace" /></Field>
          <Field label="Location"><input className="input" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="San Francisco, CA" /></Field>
        </div>
        <Field label="Bio"><textarea className="input resize-none" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="A short bio about your career and goals…" /></Field>
        <Field label="LinkedIn URL"><input className="input" value={form.linkedin_url} onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))} placeholder="https://linkedin.com/in/your-handle" /></Field>
      </div>

      <div className="card p-6 space-y-4 opacity-0 animate-fade-up animate-delay-100" style={{ animationFillMode: "forwards" }}>
        <SectionHeader icon={<Briefcase className="w-4 h-4" />} title="Career" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Current role"><input className="input" value={form.current_role} onChange={(e) => setForm((f) => ({ ...f, current_role: e.target.value }))} placeholder="Senior Engineer" /></Field>
          <Field label="Target role"><input className="input" value={form.target_role} onChange={(e) => setForm((f) => ({ ...f, target_role: e.target.value }))} placeholder="Engineering Manager" /></Field>
          <Field label="Industry">
            <select className="input" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}>
              <option value="">Select industry</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Years of experience"><input type="number" min={0} max={50} className="input" value={form.years_experience} onChange={(e) => setForm((f) => ({ ...f, years_experience: Number(e.target.value) }))} /></Field>
        </div>
      </div>

      <div className="card p-6 space-y-4 opacity-0 animate-fade-up animate-delay-200" style={{ animationFillMode: "forwards" }}>
        <SectionHeader icon={<DollarSign className="w-4 h-4" />} title="Compensation" />
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Current salary (USD / yr)"><input type="number" className="input" value={form.current_salary} onChange={(e) => setForm((f) => ({ ...f, current_salary: e.target.value }))} placeholder="120000" /></Field>
          <Field label="Target salary (USD / yr)"><input type="number" className="input" value={form.target_salary} onChange={(e) => setForm((f) => ({ ...f, target_salary: e.target.value }))} placeholder="160000" /></Field>
        </div>
      </div>

      <div className="card p-6 space-y-4 opacity-0 animate-fade-up animate-delay-300" style={{ animationFillMode: "forwards" }}>
        <SectionHeader icon={<Plus className="w-4 h-4" />} title="Skills" />
        <div className="flex gap-2">
          <input className="input flex-1" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }} placeholder="Type a skill and press Enter" />
          <button type="button" onClick={addSkill} className="btn-secondary shrink-0"><Plus className="w-4 h-4" /></button>
        </div>
        {form.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {form.skills.map((skill) => (
              <span key={skill} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-cream text-xs font-medium">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-300 transition-colors"><X className="w-3 h-3" /></button>
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
        {saved && <span className="text-sm text-sage font-medium animate-fade-in">✓ Saved!</span>}
      </div>
    </form>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-1 border-b border-cream-soft">
      <span className="text-ink/40">{icon}</span>
      <h2 className="font-display font-semibold text-sm text-ink">{title}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
