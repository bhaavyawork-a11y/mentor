"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, Target, CheckCircle2, Clock, Pause, XCircle, ChevronDown, Trash2, Loader2, Calendar, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types";

const CATEGORIES = ["role","skill","salary","network","education","other"] as const;
const PRIORITIES = ["high","medium","low"] as const;

const categoryColors: Record<string, string> = {
  role: "bg-sage/10 text-sage", skill: "bg-blue-50 text-blue-600",
  salary: "bg-amber-mentor/10 text-amber-mentor", network: "bg-purple-50 text-purple-600",
  education: "bg-pink-50 text-pink-600", other: "bg-cream text-ink/50",
};
const priorityColors: Record<string, string> = { high: "text-red-500", medium: "text-amber-mentor", low: "text-sage" };
const statusIcons: Record<string, React.ReactNode> = {
  active: <Clock className="w-4 h-4 text-ink/30" />,
  completed: <CheckCircle2 className="w-4 h-4 text-sage" />,
  paused: <Pause className="w-4 h-4 text-amber-mentor" />,
  cancelled: <XCircle className="w-4 h-4 text-red-400" />,
};

const BLANK = { title: "", description: "", category: "role" as Goal["category"], priority: "medium" as Goal["priority"], target_date: "" };

export default function GoalsClient({ goals: initial, userId }: { goals: Goal[]; userId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [goals, setGoals] = useState<Goal[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [filter, setFilter] = useState<"all" | Goal["status"]>("all");

  const filtered = filter === "all" ? goals : goals.filter((g) => g.status === filter);
  const counts = { all: goals.length, active: goals.filter((g) => g.status === "active").length, completed: goals.filter((g) => g.status === "completed").length, paused: goals.filter((g) => g.status === "paused").length };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase.from("goals").insert({ user_id: userId, ...form, target_date: form.target_date || null, milestones: [] }).select().single();
    if (!error && data) { setGoals((prev) => [data as Goal, ...prev]); setForm(BLANK); setShowForm(false); router.refresh(); }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, status: Goal["status"]) => {
    await supabase.from("goals").update({ status }).eq("id", id);
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, status } : g)));
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from("goals").delete().eq("id", id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setDeleting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1.5 bg-white rounded-xl p-1 border border-cream-soft shadow-card">
          {(["all","active","completed","paused"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize", filter === s ? "bg-ink text-cream shadow-sm" : "text-ink/40 hover:text-ink")}>
              {s} ({counts[s as keyof typeof counts] ?? 0})
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
          <Plus className="w-4 h-4" /> New goal
        </button>
      </div>

      {showForm && (
        <div className="card p-6 border-2 border-sage/20 animate-fade-up" style={{ animationFillMode: "forwards" }}>
          <h3 className="font-display font-semibold text-ink mb-5">New goal</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Goal title</label>
              <input required className="input" placeholder="e.g. Land an engineering manager role" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} placeholder="What does success look like?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Goal["category"] }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Goal["priority"] }))}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Target date</label>
                <input type="date" className="input" value={form.target_date} onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-sage disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create goal
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Target className="w-10 h-10 text-ink/15 mx-auto mb-4" />
          <p className="font-medium text-ink/40 text-sm mb-1">{filter === "all" ? "No goals yet" : `No ${filter} goals`}</p>
          {filter === "all" && <p className="text-xs text-ink/30">Create your first goal to get started.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((goal, i) => <GoalRow key={goal.id} goal={goal} index={i} onStatusChange={handleStatusChange} onDelete={handleDelete} deleting={deleting === goal.id} />)}
        </div>
      )}
    </div>
  );
}

function GoalRow({ goal, index, onStatusChange, onDelete, deleting }: { goal: Goal; index: number; onStatusChange: (id: string, status: Goal["status"]) => void; onDelete: (id: string) => void; deleting: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("card p-5 opacity-0 animate-fade-up transition-all", goal.status === "completed" && "opacity-60")} style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards" }}>
      <div className="flex items-start gap-4">
        <div className="mt-0.5">{statusIcons[goal.status]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn("font-medium text-sm text-ink", goal.status === "completed" && "line-through")}>{goal.title}</p>
            <span className={`badge text-xs ${categoryColors[goal.category]}`}>{goal.category}</span>
            <Flag className={cn("w-3 h-3", priorityColors[goal.priority])} />
          </div>
          {goal.description && <p className="text-xs text-ink/40 mt-1 leading-relaxed">{goal.description}</p>}
          {goal.target_date && (
            <div className="flex items-center gap-1 mt-2">
              <Calendar className="w-3 h-3 text-ink/30" />
              <span className="text-xs text-ink/40">{new Date(goal.target_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative">
            <button onClick={() => setOpen(!open)} className="btn-secondary text-xs py-1.5 px-2.5 gap-1 capitalize">{goal.status} <ChevronDown className="w-3 h-3" /></button>
            {open && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-float border border-cream-soft z-10 overflow-hidden min-w-32">
                {(["active","completed","paused","cancelled"] as Goal["status"][]).map((s) => (
                  <button key={s} onClick={() => { onStatusChange(goal.id, s); setOpen(false); }} className={cn("w-full text-left px-3 py-2 text-xs capitalize hover:bg-cream transition-colors", goal.status === s && "font-medium text-sage")}>{s}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onDelete(goal.id)} disabled={deleting} className="p-2 rounded-lg hover:bg-red-50 text-ink/20 hover:text-red-400 transition-all">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
