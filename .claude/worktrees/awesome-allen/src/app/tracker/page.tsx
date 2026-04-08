"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import type { Application } from "@/types";

/* ─── Constants ─────────────────────────────────── */
const COLUMNS: { status: Application["status"]; label: string; headerBg: string; headerColor: string }[] = [
  { status: "Applied",      label: "Applied",      headerBg: "#F9F7EC", headerColor: "#839958" },
  { status: "Interviewing", label: "Interviewing", headerBg: "#F7F4D5", headerColor: "#1a1a1a" },
  { status: "Offer",        label: "Offer",        headerBg: "#839958", headerColor: "#0A3323" },
  { status: "Rejected",     label: "Rejected",     headerBg: "#e8e4ce", headerColor: "#b0ab8c" },
];

const STATUS_ORDER: Application["status"][] = ["Applied", "Interviewing", "Offer", "Rejected"];

function daysSince(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/* ─── Add Application Modal ─────────────────────── */
function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const supabase = createClient();
  const { session } = useSession();
  const [form, setForm] = useState({ company: "", role: "", url: "", applied_date: new Date().toISOString().slice(0, 10), notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.company || !form.role) return;
    setSaving(true);
    await supabase.from("applications").insert({
      user_id: session?.user.id,
      company: form.company,
      role: form.role,
      url: form.url || null,
      applied_date: form.applied_date,
      notes: form.notes || null,
      status: "Applied",
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ backgroundColor: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>Add application</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#839958" }}>✕</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}><label className="label">Company *</label><input className="input" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }} placeholder="Razorpay" /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="label">Role *</label><input className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }} placeholder="Senior Product Manager" /></div>
          <div><label className="label">Date applied</label><input type="date" className="input" value={form.applied_date} onChange={(e) => setForm((f) => ({ ...f, applied_date: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }} /></div>
          <div><label className="label">Job URL</label><input className="input" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} style={{ width: "100%", boxSizing: "border-box" }} placeholder="https://…" /></div>
          <div style={{ gridColumn: "1 / -1" }}><label className="label">Notes</label><textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", resize: "none" }} placeholder="Referred by…, interview date…" /></div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !form.company || !form.role} style={{ opacity: saving || !form.company || !form.role ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Add application"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Application Card ──────────────────────────── */
function AppCard({ app, onMove, onDelete }: { app: Application; onMove: (id: string, status: Application["status"]) => void; onDelete: (id: string) => void }) {
  const [notesOpen, setNotesOpen] = useState(false);
  const days = daysSince(app.applied_date);
  const needsFollowUp = app.status === "Applied" && days >= 7;
  const currentIdx = STATUS_ORDER.indexOf(app.status);
  const nextStatus = STATUS_ORDER[currentIdx + 1] as Application["status"] | undefined;

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>{app.company}</p>
          <p style={{ fontSize: 12, color: "#839958", margin: "2px 0 0" }}>{app.role}</p>
        </div>
        <button onClick={() => onDelete(app.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 12, padding: 0 }}>✕</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#b0ab8c" }}>{new Date(app.applied_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
        {needsFollowUp && (
          <span title="It's been 7+ days. A follow-up email increases response rate by 3x." style={{ fontSize: 10, fontWeight: 700, backgroundColor: "#F7F4D5", color: "#8a7200", borderRadius: 99, padding: "2px 8px", cursor: "help" }}>
            Follow up?
          </span>
        )}
      </div>

      {app.notes && (
        <div>
          <button onClick={() => setNotesOpen((o) => !o)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#839958", padding: 0, textAlign: "left" }}>
            {notesOpen ? "▲ Hide notes" : "▼ Notes"}
          </button>
          {notesOpen && <p style={{ fontSize: 12, color: "#555", margin: "6px 0 0", lineHeight: 1.5 }}>{app.notes}</p>}
        </div>
      )}

      {nextStatus && (
        <button
          onClick={() => onMove(app.id, nextStatus)}
          style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#e8e4ce", color: "#555", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", alignSelf: "flex-start" }}
        >
          Move to {nextStatus} →
        </button>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────── */
export default function TrackerPage() {
  const supabase = createClient();
  const { session } = useSession();
  const [apps, setApps] = useState<Application[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadApps = useCallback(async () => {
    if (!session?.user.id) return;
    const { data } = await supabase.from("applications").select("*").eq("user_id", session.user.id).order("applied_date", { ascending: false });
    setApps((data as Application[]) ?? []);
    setLoading(false);
  }, [session?.user.id, supabase]);

  useEffect(() => { loadApps(); }, [loadApps]);

  const moveApp = async (id: string, status: Application["status"]) => {
    await supabase.from("applications").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
  };

  const deleteApp = async (id: string) => {
    await supabase.from("applications").delete().eq("id", id);
    setApps((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1a1a1a", margin: "0 0 6px" }}>My applications</h1>
          <p style={{ fontSize: 14, color: "#839958", margin: 0 }}>{apps.length} application{apps.length !== 1 ? "s" : ""} tracked</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add application</button>
      </div>

      {loading ? (
        <p style={{ fontSize: 14, color: "#839958" }}>Loading…</p>
      ) : (
        /* Kanban */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, overflowX: "auto" }}>
          {COLUMNS.map(({ status, label, headerBg, headerColor }) => {
            const col = apps.filter((a) => a.status === status);
            return (
              <div key={status} style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 220 }}>
                {/* Column header */}
                <div style={{ backgroundColor: headerBg, borderRadius: 10, padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: headerColor }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: headerColor, backgroundColor: "rgba(0,0,0,0.08)", borderRadius: 99, padding: "2px 8px" }}>{col.length}</span>
                </div>
                {/* Cards */}
                {col.length === 0 ? (
                  <div style={{ border: "1px dashed #e8e4ce", borderRadius: 12, padding: "24px 14px", textAlign: "center" }}>
                    <p style={{ fontSize: 12, color: "#ccc", margin: 0 }}>Empty</p>
                  </div>
                ) : (
                  col.map((app) => (
                    <AppCard key={app.id} app={app} onMove={moveApp} onDelete={deleteApp} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onSaved={loadApps} />}
    </div>
  );
}
