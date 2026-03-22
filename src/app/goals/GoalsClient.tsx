"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, CheckCircle2, Clock, Pause, XCircle, ChevronDown, Trash2, Loader2, Calendar } from "lucide-react";
import type { Goal } from "@/types";

const CATEGORIES = ["role","skill","salary","network","education","other"] as const;
const PRIORITIES  = ["high","medium","low"] as const;

const CAT_BG: Record<string, string> = {
  role: "#C4B5FD", skill: "#00C9A7", salary: "#FDE68A",
  network: "#C4B5FD", education: "#FDE68A", other: "#eeeeee",
};
const PRI_COLOR: Record<string, string> = {
  high: "#ef4444", medium: "#FDE68A", low: "#00C9A7",
};

const BLANK = {
  title: "", description: "", category: "role" as Goal["category"],
  priority: "medium" as Goal["priority"], target_date: "",
};

export default function GoalsClient({ goals: initial, userId }: { goals: Goal[]; userId: string }) {
  const router   = useRouter();
  const supabase = createClient();
  const [goals, setGoals]     = useState<Goal[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm]       = useState(BLANK);
  const [filter, setFilter]   = useState<"all" | Goal["status"]>("all");

  const filtered = filter === "all" ? goals : goals.filter((g) => g.status === filter);
  const counts   = {
    all: goals.length,
    active: goals.filter((g) => g.status === "active").length,
    completed: goals.filter((g) => g.status === "completed").length,
    paused: goals.filter((g) => g.status === "paused").length,
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { data, error } = await supabase
      .from("goals")
      .insert({ user_id: userId, ...form, target_date: form.target_date || null, milestones: [] })
      .select().single();
    if (!error && data) { setGoals((p) => [data as Goal, ...p]); setForm(BLANK); setShowForm(false); router.refresh(); }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, status: Goal["status"]) => {
    await supabase.from("goals").update({ status }).eq("id", id);
    setGoals((p) => p.map((g) => g.id === id ? { ...g, status } : g));
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from("goals").delete().eq("id", id);
    setGoals((p) => p.filter((g) => g.id !== id));
    setDeleting(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Filter + new button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "6px", backgroundColor: "#ffffff", border: "1px solid #eeeeee", borderRadius: "10px", padding: "4px" }}>
          {(["all","active","completed","paused"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              style={{
                padding: "6px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
                fontSize: "12px", fontWeight: 600, textTransform: "capitalize",
                backgroundColor: filter === s ? "#1B3A35" : "transparent",
                color: filter === s ? "#00C9A7" : "#888888",
                transition: "all 0.15s",
              }}>
              {s} ({counts[s as keyof typeof counts] ?? 0})
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary" style={{ gap: "6px" }}>
          <Plus style={{ width: "14px", height: "14px" }} /> New quest
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #eeeeee", borderRadius: "16px", padding: "24px", animation: "fadeUp 0.3s ease forwards" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "18px" }}>New Quest</h3>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label className="label">Goal title</label>
              <input required className="input" placeholder="e.g. Land an engineering manager role"
                value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" style={{ resize: "none" }} rows={2} placeholder="What does success look like?"
                value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
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
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>
                {saving ? <Loader2 style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <Plus style={{ width: "14px", height: "14px" }} />}
                Create quest
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #eeeeee", borderRadius: "16px", padding: "48px 24px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#888888", marginBottom: "4px" }}>
            {filter === "all" ? "No quests yet" : `No ${filter} quests`}
          </p>
          {filter === "all" && <p style={{ fontSize: "12px", color: "#aaaaaa" }}>Create your first quest to start earning XP.</p>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((goal, i) => (
            <GoalRow key={goal.id} goal={goal} index={i}
              onStatusChange={handleStatusChange} onDelete={handleDelete} deleting={deleting === goal.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalRow({ goal, index, onStatusChange, onDelete, deleting }: {
  goal: Goal; index: number;
  onStatusChange: (id: string, s: Goal["status"]) => void;
  onDelete: (id: string) => void; deleting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const catBg = CAT_BG[goal.category] ?? "#eeeeee";
  const priColor = PRI_COLOR[goal.priority] ?? "#888888";

  const statusIcon = {
    active:    <Clock style={{ width: "14px", height: "14px", color: "#888888" }} />,
    completed: <CheckCircle2 style={{ width: "14px", height: "14px", color: "#00C9A7" }} />,
    paused:    <Pause style={{ width: "14px", height: "14px", color: "#FDE68A" }} />,
    cancelled: <XCircle style={{ width: "14px", height: "14px", color: "#ef4444" }} />,
  }[goal.status];

  return (
    <div style={{
      backgroundColor: "#ffffff", border: "1px solid #eeeeee", borderRadius: "14px",
      padding: "14px 18px", opacity: goal.status === "completed" ? 0.65 : 1,
      animation: `fadeUp 0.3s ease ${index * 40}ms both`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ marginTop: "2px" }}>{statusIcon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <p style={{
              fontSize: "13px", fontWeight: 600, color: "#1a1a1a", margin: 0,
              textDecoration: goal.status === "completed" ? "line-through" : "none",
            }}>{goal.title}</p>
            <span style={{
              fontSize: "10px", fontWeight: 600, borderRadius: "99px", padding: "2px 8px",
              backgroundColor: catBg, color: "#1a1a1a", textTransform: "capitalize",
            }}>{goal.category}</span>
            <span style={{ fontSize: "10px", color: priColor, fontWeight: 700 }}>● {goal.priority}</span>
          </div>
          {goal.description && (
            <p style={{ fontSize: "11px", color: "#888888", marginTop: "3px" }}>{goal.description}</p>
          )}
          {goal.target_date && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
              <Calendar style={{ width: "10px", height: "10px", color: "#aaaaaa" }} />
              <span style={{ fontSize: "11px", color: "#aaaaaa" }}>
                {new Date(goal.target_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setOpen(!open)}
              style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                backgroundColor: "#FAF7F2", border: "1px solid #eeeeee",
                fontSize: "11px", fontWeight: 600, borderRadius: "8px",
                padding: "5px 10px", cursor: "pointer", color: "#1a1a1a",
                textTransform: "capitalize",
              }}>
              {goal.status} <ChevronDown style={{ width: "10px", height: "10px" }} />
            </button>
            {open && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 4px)",
                backgroundColor: "#ffffff", border: "1px solid #eeeeee",
                borderRadius: "12px", boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                overflow: "hidden", minWidth: "130px", zIndex: 10,
              }}>
                {(["active","completed","paused","cancelled"] as Goal["status"][]).map((s) => (
                  <button key={s} onClick={() => { onStatusChange(goal.id, s); setOpen(false); }}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "8px 12px", border: "none", background: "none",
                      fontSize: "12px", cursor: "pointer", textTransform: "capitalize",
                      color: goal.status === s ? "#00C9A7" : "#1a1a1a",
                      fontWeight: goal.status === s ? 700 : 400,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onDelete(goal.id)} disabled={deleting}
            style={{
              padding: "6px", borderRadius: "8px", border: "none", background: "none",
              cursor: "pointer", color: "#aaaaaa", display: "flex", alignItems: "center",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#aaaaaa")}
          >
            {deleting ? <Loader2 style={{ width: "13px", height: "13px" }} /> : <Trash2 style={{ width: "13px", height: "13px" }} />}
          </button>
        </div>
      </div>
    </div>
  );
}
