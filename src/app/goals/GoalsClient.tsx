"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, Target, CheckCircle2, Clock, Pause, XCircle, ChevronDown, Trash2, Loader2, Calendar, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Goal } from "@/types";

const CATEGORIES = ["role","skill","salary","network","education","other"] as const;
const PRIORITIES = ["high","medium","low"] as const;

const CATEGORY_BG: Record<string, string> = {
  role: "#E7BEF8", skill: "#93ABD9", salary: "#EDE986",
  network: "#F2619C22", education: "#E7BEF822", other: "#f0f0f0",
};

const PRIORITY_COLOR: Record<string, string> = {
  high: "#F2619C", medium: "#EDE986", low: "#93ABD9",
};

const BLANK = {
  title: "", description: "", category: "role" as Goal["category"],
  priority: "medium" as Goal["priority"], target_date: "",
};

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
  const counts = {
    all: goals.length,
    active: goals.filter((g) => g.status === "active").length,
    completed: goals.filter((g) => g.status === "completed").length,
    paused: goals.filter((g) => g.status === "paused").length,
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from("goals")
      .insert({ user_id: userId, ...form, target_date: form.target_date || null, milestones: [] })
      .select().single();
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
        <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: "#ffffff", border: "1.5px solid #f0f0f0" }}>
          {(["all","active","completed","paused"] as const).map((s) => (
            <button
              key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all capitalize"
              style={
                filter === s
                  ? { background: "#F2619C", color: "#ffffff" }
                  : { color: "#0f0f0f66" }
              }
            >
              {s} ({counts[s as keyof typeof counts] ?? 0})
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-[13px]">
          <Plus className="w-4 h-4" /> New goal
        </button>
      </div>

      {showForm && (
        <div className="card opacity-0 animate-fade-up" style={{ animationFillMode: "forwards", borderColor: "#F2619C44", padding: "24px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 800, color: "#0f0f0f", marginBottom: "20px" }}>New goal</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Goal title</label>
              <input required className="input" placeholder="e.g. Land an engineering manager role"
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={2} placeholder="What does success look like?"
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
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
                <input type="date" className="input" value={form.target_date}
                  onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create goal
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card text-center" style={{ padding: "64px 24px" }}>
          <Target className="w-10 h-10 mx-auto mb-4" style={{ color: "#0f0f0f22" }} />
          <p className="font-medium text-[13px] mb-1" style={{ color: "#0f0f0f66" }}>
            {filter === "all" ? "No goals yet" : `No ${filter} goals`}
          </p>
          {filter === "all" && (
            <p className="text-[11px]" style={{ color: "#0f0f0f44" }}>
              Create your first goal to start earning XP.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((goal, i) => (
            <GoalRow
              key={goal.id} goal={goal} index={i}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              deleting={deleting === goal.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalRow({
  goal, index, onStatusChange, onDelete, deleting,
}: {
  goal: Goal; index: number;
  onStatusChange: (id: string, status: Goal["status"]) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const catBg = CATEGORY_BG[goal.category] ?? "#f0f0f0";
  const priColor = PRIORITY_COLOR[goal.priority] ?? "#0f0f0f66";

  const statusIcon = {
    active: <Clock className="w-4 h-4" style={{ color: "#0f0f0f44" }} />,
    completed: <CheckCircle2 className="w-4 h-4" style={{ color: "#F2619C" }} />,
    paused: <Pause className="w-4 h-4" style={{ color: "#EDE986" }} />,
    cancelled: <XCircle className="w-4 h-4" style={{ color: "#dc2626" }} />,
  }[goal.status];

  return (
    <div
      className={cn("card opacity-0 animate-fade-up transition-all", goal.status === "completed" && "opacity-60")}
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "forwards", padding: "16px 18px" }}
    >
      <div className="flex items-start gap-4">
        <div className="mt-0.5">{statusIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={cn("font-medium text-[13px]", goal.status === "completed" && "line-through")}
              style={{ color: "#0f0f0f" }}
            >
              {goal.title}
            </p>
            <span
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg capitalize"
              style={{ background: catBg, color: "#0f0f0f" }}
            >
              {goal.category}
            </span>
            <Flag className="w-3 h-3" style={{ color: priColor }} />
          </div>
          {goal.description && (
            <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "#0f0f0f66" }}>
              {goal.description}
            </p>
          )}
          {goal.target_date && (
            <div className="flex items-center gap-1 mt-2">
              <Calendar className="w-3 h-3" style={{ color: "#0f0f0f44" }} />
              <span className="text-[11px]" style={{ color: "#0f0f0f66" }}>
                {new Date(goal.target_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-all"
              style={{ background: "#f0f0f0", color: "#0f0f0f" }}
            >
              {goal.status} <ChevronDown className="w-3 h-3" />
            </button>
            {open && (
              <div
                className="absolute right-0 top-full mt-1 rounded-xl shadow-float z-10 overflow-hidden min-w-32"
                style={{ background: "#ffffff", border: "1.5px solid #f0f0f0" }}
              >
                {(["active","completed","paused","cancelled"] as Goal["status"][]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { onStatusChange(goal.id, s); setOpen(false); }}
                    className="w-full text-left px-3 py-2 text-[11px] capitalize transition-colors hover:bg-[#fdf9f7]"
                    style={{ color: goal.status === s ? "#F2619C" : "#0f0f0f", fontWeight: goal.status === s ? 600 : 400 }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onDelete(goal.id)} disabled={deleting}
            className="p-2 rounded-lg transition-all hover:bg-red-50"
            style={{ color: "#0f0f0f33" }}
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
