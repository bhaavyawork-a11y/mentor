"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const SERVICE_PRESETS = [
  { title: "1:1 Coaching Session",    type: "coaching",       duration_mins: 60,  price_cents: 299900, icon: "🎯" },
  { title: "Mock Interview",          type: "mock_interview", duration_mins: 60,  price_cents: 199900, icon: "🎤" },
  { title: "Resume Review",           type: "review",         duration_mins: 30,  price_cents: 99900,  icon: "📄" },
  { title: "Career Strategy Call",    type: "session",        duration_mins: 45,  price_cents: 249900, icon: "🗺️" },
  { title: "LinkedIn Profile Review", type: "review",         duration_mins: 30,  price_cents: 99900,  icon: "💼" },
  { title: "Salary Negotiation Call", type: "coaching",       duration_mins: 45,  price_cents: 199900, icon: "💰" },
  { title: "Mentorship Package",      type: "mentorship",     duration_mins: 60,  price_cents: 999900, icon: "🌱" },
];

const TYPE_LABELS: Record<string, string> = {
  session: "Session", review: "Review", course: "Course", package: "Package",
  mock_interview: "Mock Interview", coaching: "Coaching", mentorship: "Mentorship", custom: "Custom",
};

interface Service {
  id: string; title: string; description: string | null; type: string;
  duration_mins: number; price_cents: number; is_active: boolean;
}

interface FormState {
  title: string; description: string; type: string;
  duration_mins: string; price_inr: string; is_active: boolean;
}

const BLANK: FormState = { title: "", description: "", type: "session", duration_mins: "60", price_inr: "2999", is_active: true };

function formatINR(cents: number) {
  return "₹" + (cents / 100).toLocaleString("en-IN");
}

export default function ExpertServicesPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [services, setServices]   = useState<Service[]>([]);
  const [expertId, setExpertId]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(BLANK);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }
      const { data: expert } = await supabase.from("experts").select("id").eq("user_id", session.user.id).single();
      if (!expert) { router.push("/expert-dashboard/profile"); return; }
      setExpertId(expert.id);
      const { data } = await supabase.from("services").select("*").eq("expert_id", expert.id).order("created_at");
      setServices((data ?? []) as Service[]);
      setLoading(false);
    })();
  }, [supabase, router]);

  const openNew = (preset?: typeof SERVICE_PRESETS[0]) => {
    setEditing(null);
    setForm(preset ? {
      title: preset.title, description: "", type: preset.type,
      duration_mins: String(preset.duration_mins),
      price_inr: String(preset.price_cents / 100), is_active: true,
    } : BLANK);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (s: Service) => {
    setEditing(s.id);
    setForm({
      title: s.title, description: s.description ?? "",
      type: s.type, duration_mins: String(s.duration_mins),
      price_inr: String(s.price_cents / 100), is_active: s.is_active,
    });
    setShowForm(true);
    setError(null);
  };

  const save = async () => {
    if (!expertId) return;
    setSaving(true); setError(null);
    const body = {
      ...form,
      price_cents: Math.round(parseFloat(form.price_inr) * 100),
      duration_mins: parseInt(form.duration_mins),
      expert_id: expertId,
    };
    try {
      const url  = editing ? `/api/expert/services/${editing}` : "/api/expert/services";
      const method = editing ? "PUT" : "POST";
      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");

      if (editing) {
        setServices(s => s.map(x => x.id === editing ? json : x));
      } else {
        setServices(s => [...s, json]);
      }
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Service) => {
    const res  = await fetch(`/api/expert/services/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !s.is_active }),
    });
    if (res.ok) setServices(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !s.is_active } : x));
  };

  const deleteService = async (id: string) => {
    if (!confirm("Delete this service? This can't be undone.")) return;
    await fetch(`/api/expert/services/${id}`, { method: "DELETE" });
    setServices(s => s.filter(x => x.id !== id));
  };

  if (loading) return <div style={{ padding: 40 }}><p style={{ color: "#6B7280" }}>Loading…</p></div>;

  return (
    <div style={{ padding: 32, maxWidth: 720 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F9FAFB", margin: "0 0 4px" }}>Services</h1>
          <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>What you offer and at what price. Only active services appear to mentees.</p>
        </div>
        <button onClick={() => openNew()} style={{
          backgroundColor: "#064E3B", color: "#6B7280", border: "none",
          borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>
          + Add service
        </button>
      </div>

      {/* Quick-add presets (shown when no services exist) */}
      {services.length === 0 && !showForm && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Quick-add a preset
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {SERVICE_PRESETS.map(p => (
              <button key={p.title} onClick={() => openNew(p)} style={{
                backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 12,
                padding: "14px 16px", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#0A3323")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8e4ce")}
              >
                <div style={{ fontSize: 20, marginBottom: 8 }}>{p.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 4 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>{p.duration_mins} min · {formatINR(p.price_cents)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div style={{ backgroundColor: "#181C24", border: "1px solid #1F2937", borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "#F9FAFB", margin: "0 0 20px" }}>
            {editing ? "Edit service" : "New service"}
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Mock Interview — Product Management"
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #1F2937", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", color: "#F9FAFB" }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>Description (optional)</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What's included? What will the mentee get out of this?"
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #1F2937", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", resize: "vertical", color: "#F9FAFB" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                style={{ width: "100%", border: "1px solid #1F2937", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", backgroundColor: "#181C24", color: "#F9FAFB" }}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>Duration (mins)</label>
              <input type="number" min={15} max={180} step={15}
                value={form.duration_mins} onChange={e => setForm(f => ({ ...f, duration_mins: e.target.value }))}
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #1F2937", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", color: "#F9FAFB" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9FAFB", marginBottom: 6 }}>Price (₹)</label>
              <input type="number" min={0}
                value={form.price_inr} onChange={e => setForm(f => ({ ...f, price_inr: e.target.value }))}
                placeholder="2999"
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #1F2937", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontFamily: "inherit", outline: "none", color: "#F9FAFB" }} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            <label htmlFor="active" style={{ fontSize: 13, color: "#F9FAFB" }}>Active — visible to mentees</label>
          </div>

          {error && <p style={{ fontSize: 12, color: "#dc2626", marginBottom: 14, backgroundColor: "#fee2e2", padding: "8px 12px", borderRadius: 8 }}>{error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={save} disabled={saving || !form.title} style={{
              backgroundColor: "#064E3B", color: "#F9FAFB", border: "none",
              borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700,
              cursor: saving || !form.title ? "default" : "pointer", opacity: !form.title ? 0.6 : 1,
            }}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add service"}
            </button>
            <button onClick={() => setShowForm(false)} style={{
              backgroundColor: "transparent", border: "1px solid #1F2937", color: "#9CA3AF",
              borderRadius: 10, padding: "10px 16px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Services list */}
      {services.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {services.map(s => (
            <div key={s.id} style={{
              backgroundColor: "#181C24", border: `1px solid ${s.is_active ? "#e8e4ce" : "#f0ede0"}`,
              borderRadius: 14, padding: "16px 18px",
              display: "flex", alignItems: "center", gap: 14,
              opacity: s.is_active ? 1 : 0.6,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB", margin: 0 }}>{s.title}</p>
                  <span style={{
                    fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "2px 8px",
                    backgroundColor: s.is_active ? "#e8f5e9" : "#f0f0f0",
                    color: s.is_active ? "#1b5e20" : "#888",
                  }}>
                    {s.is_active ? "Active" : "Paused"}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
                  {TYPE_LABELS[s.type]} · {s.duration_mins} min
                </p>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#F9FAFB", flexShrink: 0 }}>
                {formatINR(s.price_cents)}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={() => openEdit(s)} style={{
                  fontSize: 12, backgroundColor: "#f5f5f0", color: "#9CA3AF", border: "none",
                  borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit",
                }}>Edit</button>
                <button onClick={() => toggleActive(s)} style={{
                  fontSize: 12, backgroundColor: s.is_active ? "#FFF3CC" : "#e8f5e9",
                  color: s.is_active ? "#8a6200" : "#1b5e20",
                  border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit",
                }}>
                  {s.is_active ? "Pause" : "Activate"}
                </button>
                <button onClick={() => deleteService(s.id)} style={{
                  fontSize: 12, backgroundColor: "#fee2e2", color: "#dc2626",
                  border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit",
                }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
