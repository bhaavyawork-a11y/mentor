"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function formatINR(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents / 100);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#FFF3CC", color: "#8a6200" },
  confirmed: { bg: "#e8f5e9", color: "#1b5e20" },
  completed: { bg: "#f0f0f0", color: "#555"    },
  cancelled: { bg: "#fee2e2", color: "#dc2626" },
};

interface Expert {
  id: string; full_name: string; headline: string | null;
  rating: number; review_count: number; is_verified: boolean;
  total_earned_cents: number; pending_payout_cents: number;
  google_connected: boolean;
}
interface Booking {
  id: string; status: string; scheduled_at: string | null;
  amount_cents: number | null; meeting_url: string | null;
  user: { full_name: string } | null;
  service: { title: string; duration_mins: number } | null;
}

export default function ExpertOverviewPage() {
  const supabase = createClient();
  const router   = useRouter();
  const [expert, setExpert]     = useState<Expert | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [notExpert, setNotExpert] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const { data: expertData } = await supabase
        .from("experts")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (!expertData) { setNotExpert(true); setLoading(false); return; }
      setExpert(expertData as Expert);

      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*, user:profiles(full_name), service:services(title, duration_mins)")
        .eq("expert_id", expertData.id)
        .order("scheduled_at", { ascending: true });

      const raw = (bookingData ?? []) as Array<Omit<Booking, "user" | "service"> & {
        user: Booking["user"] | Booking["user"][];
        service: Booking["service"] | Booking["service"][];
      }>;
      const mapped = raw.map(b => ({
        ...b,
        user:    Array.isArray(b.user)    ? b.user[0]    : b.user,
        service: Array.isArray(b.service) ? b.service[0] : b.service,
      }));
      setBookings(mapped);
      setTotalSessions(mapped.filter(b => b.status === "completed").length);
      setLoading(false);
    })();
  }, [supabase, router]);

  if (loading) return (
    <div style={{ padding: 40 }}>
      <p style={{ color: "#839958", fontSize: 14 }}>Loading your dashboard…</p>
    </div>
  );

  if (notExpert) return (
    <div style={{ padding: 40, maxWidth: 520 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0A3323", marginBottom: 8 }}>Welcome to the Expert Portal</h1>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>
        Set up your expert profile to start accepting bookings, earning money, and helping early-career professionals grow.
      </p>
      <Link href="/expert-dashboard/profile" style={{
        display: "inline-block", backgroundColor: "#0A3323", color: "#839958",
        padding: "12px 24px", borderRadius: 12, textDecoration: "none",
        fontSize: 14, fontWeight: 700,
      }}>
        Create my expert profile →
      </Link>
    </div>
  );

  const upcoming = bookings.filter(b =>
    ["confirmed", "pending"].includes(b.status) &&
    b.scheduled_at && new Date(b.scheduled_at) > new Date()
  );

  const thisMonth = bookings
    .filter(b => {
      const d = new Date(b.scheduled_at ?? "0");
      const now = new Date();
      return b.status === "completed" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, b) => sum + (b.amount_cents ?? 0), 0);

  const stats = [
    { label: "Total Earned",       value: formatINR(expert!.total_earned_cents ?? 0), icon: "💰", color: "#0A3323" },
    { label: "This Month",         value: formatINR(thisMonth),                         icon: "📈", color: "#0A3323" },
    { label: "Available Payout",   value: formatINR(expert!.pending_payout_cents ?? 0), icon: "🏦", color: "#0A3323" },
    { label: "Sessions Completed", value: String(totalSessions),                        icon: "✅", color: "#0A3323" },
    { label: "Rating",             value: `${(expert!.rating ?? 0).toFixed(1)} ⭐`,    icon: "⭐", color: "#0A3323" },
  ];

  return (
    <div style={{ padding: 32, maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0A3323", margin: "0 0 4px" }}>
          Hey, {expert!.full_name.split(" ")[0]} 👋
        </h1>
        <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>
          {expert!.headline ?? "Set up your headline in My Profile"}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 14, padding: "16px 18px",
          }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#839958" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      {!expert!.google_connected && (
        <div style={{
          backgroundColor: "#FFF9F0", border: "1px solid #f0d9a0", borderRadius: 14, padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 16, marginBottom: 24,
        }}>
          <span style={{ fontSize: 24 }}>📹</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#0A3323", margin: "0 0 2px" }}>
              Connect Google Meet
            </p>
            <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>
              Auto-generate unique Meet links every time a booking is confirmed.
            </p>
          </div>
          <Link href="/api/expert/google/auth" style={{
            backgroundColor: "#0A3323", color: "#839958",
            padding: "9px 18px", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none",
          }}>
            Connect →
          </Link>
        </div>
      )}

      {/* Upcoming bookings */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8e4ce", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#0A3323", margin: 0 }}>
            Upcoming Bookings {upcoming.length > 0 && <span style={{ fontSize: 11, backgroundColor: "#0A3323", color: "#839958", borderRadius: 99, padding: "2px 8px", marginLeft: 8 }}>{upcoming.length}</span>}
          </p>
          <Link href="/expert-dashboard/bookings" style={{ fontSize: 12, color: "#839958", textDecoration: "none" }}>View all →</Link>
        </div>

        {upcoming.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>📅</p>
            <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>No upcoming bookings yet. Make sure your services are live!</p>
          </div>
        ) : (
          <div>
            {upcoming.map((b, i) => {
              const chip = STATUS_CHIP[b.status] ?? STATUS_CHIP.pending;
              return (
                <div key={b.id} style={{
                  padding: "14px 20px", borderBottom: i < upcoming.length - 1 ? "1px solid #f0efe8" : "none",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, backgroundColor: "#F7F4D5",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800, color: "#0A3323", flexShrink: 0,
                  }}>
                    {b.user?.full_name?.[0] ?? "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px" }}>
                      {b.user?.full_name ?? "User"}
                    </p>
                    <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>
                      {b.service?.title} · {b.scheduled_at ? formatDate(b.scheduled_at) : "Time TBD"}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    {b.amount_cents && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#0A3323" }}>{formatINR(b.amount_cents)}</span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "3px 8px", ...chip }}>
                      {b.status}
                    </span>
                    {b.meeting_url && (
                      <a href={b.meeting_url} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: 11, backgroundColor: "#0A3323", color: "#839958",
                        borderRadius: 8, padding: "5px 10px", textDecoration: "none", fontWeight: 700,
                      }}>📹 Join</a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
