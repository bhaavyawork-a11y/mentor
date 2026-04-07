"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function formatINR(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents / 100);
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: "#FFF3CC", color: "#8a6200", label: "Pending" },
  confirmed: { bg: "#e8f5e9", color: "#1b5e20", label: "Confirmed" },
  completed: { bg: "#f0f0f0", color: "#555",    label: "Completed" },
  cancelled: { bg: "#fee2e2", color: "#dc2626", label: "Cancelled" },
  refunded:  { bg: "#f5f0ff", color: "#6b21a8", label: "Refunded" },
};

interface Booking {
  id: string; status: string; scheduled_at: string | null;
  amount_cents: number | null; meeting_url: string | null; notes: string | null;
  user: { full_name: string; email?: string } | null;
  service: { title: string; duration_mins: number; type: string } | null;
}

export default function ExpertBookingsPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<"upcoming" | "past" | "all">("upcoming");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: expert } = await supabase.from("experts").select("id").eq("user_id", session.user.id).single();
      if (!expert) { router.push("/expert-dashboard/profile"); return; }

      const { data } = await supabase
        .from("bookings")
        .select("*, user:profiles(full_name), service:services(title, duration_mins, type)")
        .eq("expert_id", expert.id)
        .order("scheduled_at", { ascending: false });

      const raw = (data ?? []) as Array<Omit<Booking, "user" | "service"> & {
        user: Booking["user"] | Booking["user"][];
        service: Booking["service"] | Booking["service"][];
      }>;
      setBookings(raw.map(b => ({
        ...b,
        user:    Array.isArray(b.user)    ? b.user[0]    : b.user,
        service: Array.isArray(b.service) ? b.service[0] : b.service,
      })));
      setLoading(false);
    })();
  }, [supabase, router]);

  const updateBooking = async (id: string, updates: Record<string, unknown>) => {
    setActionLoading(id);
    const res  = await fetch(`/api/expert/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setBookings(prev => prev.map(b => b.id === id ? {
        ...b,
        ...updated,
        user:    Array.isArray(updated.user)    ? updated.user[0]    : updated.user    ?? b.user,
        service: Array.isArray(updated.service) ? updated.service[0] : updated.service ?? b.service,
      } : b));
    }
    setActionLoading(null);
  };

  const now = new Date();
  const displayed = bookings.filter(b => {
    const d = b.scheduled_at ? new Date(b.scheduled_at) : null;
    if (filter === "upcoming") return d && d > now && ["pending", "confirmed"].includes(b.status);
    if (filter === "past")     return !d || d <= now || b.status === "completed";
    return true;
  });

  if (loading) return <div style={{ padding: 40 }}><p style={{ color: "#839958" }}>Loading…</p></div>;

  return (
    <div style={{ padding: 32, maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0A3323", margin: "0 0 4px" }}>Bookings</h1>
        <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>{bookings.length} total booking{bookings.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(["upcoming", "past", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "7px 16px", borderRadius: 99, fontSize: 12, fontWeight: filter === f ? 700 : 500,
            backgroundColor: filter === f ? "#0A3323" : "#f5f5f0",
            color: filter === f ? "#839958" : "#666",
            border: "none", cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
          }}>
            {f === "upcoming" ? "Upcoming" : f === "past" ? "Past" : "All"}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
          <p style={{ fontSize: 13, color: "#839958" }}>
            {filter === "upcoming" ? "No upcoming bookings." : "No bookings here yet."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayed.map(b => {
            const chip   = STATUS_CHIP[b.status] ?? STATUS_CHIP.pending;
            const isNext = b.scheduled_at && new Date(b.scheduled_at) > now && b.status === "confirmed";
            return (
              <div key={b.id} style={{
                backgroundColor: "#fff",
                border: `1px solid ${isNext ? "#839958" : "#e8e4ce"}`,
                borderRadius: 16, padding: "18px 20px",
                boxShadow: isNext ? "0 2px 12px rgba(131,153,88,0.12)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, backgroundColor: "#F7F4D5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 800, color: "#0A3323", flexShrink: 0,
                  }}>
                    {b.user?.full_name?.[0] ?? "?"}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
                        {b.user?.full_name ?? "User"}
                      </p>
                      <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "3px 9px", ...chip }}>
                        {chip.label}
                      </span>
                      {isNext && <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "3px 9px", backgroundColor: "#e8f5e9", color: "#1b5e20" }}>Next up</span>}
                    </div>
                    <p style={{ fontSize: 12, color: "#839958", margin: "0 0 2px" }}>{b.service?.title}</p>
                    {b.scheduled_at && (
                      <p style={{ fontSize: 12, color: "#b0ab8c", margin: 0 }}>🗓 {formatDate(b.scheduled_at)}</p>
                    )}
                    {b.notes && (
                      <p style={{ fontSize: 11, color: "#888", margin: "6px 0 0", fontStyle: "italic" }}>"{b.notes}"</p>
                    )}
                  </div>

                  {/* Amount */}
                  {b.amount_cents && (
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0A3323", flexShrink: 0 }}>
                      {formatINR(b.amount_cents)}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  {b.status === "pending" && (
                    <button
                      onClick={() => updateBooking(b.id, { status: "confirmed" })}
                      disabled={actionLoading === b.id}
                      style={{
                        fontSize: 12, fontWeight: 700, backgroundColor: "#0A3323", color: "#839958",
                        border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit",
                      }}>
                      {actionLoading === b.id ? "…" : "✓ Confirm booking"}
                    </button>
                  )}
                  {b.status === "confirmed" && (
                    <button
                      onClick={() => updateBooking(b.id, { status: "completed" })}
                      disabled={actionLoading === b.id}
                      style={{
                        fontSize: 12, fontWeight: 700, backgroundColor: "#f0f0f0", color: "#555",
                        border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit",
                      }}>
                      {actionLoading === b.id ? "…" : "Mark complete"}
                    </button>
                  )}
                  {b.meeting_url ? (
                    <a href={b.meeting_url} target="_blank" rel="noopener noreferrer" style={{
                      fontSize: 12, fontWeight: 700, backgroundColor: "#e8f5e9", color: "#1b5e20",
                      borderRadius: 8, padding: "7px 14px", textDecoration: "none",
                    }}>
                      📹 Join Meet
                    </a>
                  ) : b.status === "confirmed" && (
                    <button
                      onClick={() => updateBooking(b.id, { generate_meet: true })}
                      disabled={actionLoading === b.id}
                      style={{
                        fontSize: 12, fontWeight: 700, backgroundColor: "#FFF3CC", color: "#8a6200",
                        border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit",
                      }}>
                      {actionLoading === b.id ? "Generating…" : "📹 Generate Meet link"}
                    </button>
                  )}
                  {["pending", "confirmed"].includes(b.status) && (
                    <button
                      onClick={() => updateBooking(b.id, { status: "cancelled" })}
                      disabled={actionLoading === b.id}
                      style={{
                        fontSize: 12, fontWeight: 700, backgroundColor: "#fee2e2", color: "#dc2626",
                        border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontFamily: "inherit",
                      }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
