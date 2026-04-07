"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";

/* ─── Types ─────────────────────────────────────────────────────── */
interface Service {
  id: string;
  title: string;
  description: string | null;
  type: string;
  duration_mins: number;
  price_cents: number;
  is_active: boolean;
}

interface Expert {
  id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  expertise_areas: string[];
  industries: string[];
  years_experience: number;
  rating: number;
  review_count: number;
  is_verified: boolean;
  services: Service[];
}

interface Booking {
  id: string;
  status: string;
  scheduled_at: string | null;
  duration_mins: number | null;
  amount_cents: number | null;
  currency: string;
  meeting_url: string | null;
  created_at: string;
  expert: { full_name: string; headline: string | null } | null;
  service: { title: string; duration_mins: number; type: string } | null;
}

/* ─── Helpers ───────────────────────────────────────────────────── */
function formatINR(cents: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(cents / 100);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return `Today · ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow · ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + ` · ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

const PALETTE = ["#F7F4D5", "#D3968C", "#839958", "#B5D5FF", "#FFCBA4", "#FFB5C8"];
function avatarBg(id: string) {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return PALETTE[h % PALETTE.length];
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  confirmed: { bg: "#83995822", color: "#0A3323", label: "Confirmed" },
  pending:   { bg: "#FFF3CC",   color: "#8a6200", label: "Pending" },
  completed: { bg: "#f0f0f0",   color: "#666",    label: "Completed" },
  cancelled: { bg: "#fee2e2",   color: "#dc2626", label: "Cancelled" },
  refunded:  { bg: "#f0f0f0",   color: "#999",    label: "Refunded" },
};

/* ─── BookNow button ─────────────────────────────────────────────── */
function BookButton({ serviceId, expertId, label, price }: { serviceId: string; expertId: string; label: string; price: number }) {
  const [loading, setLoading] = useState(false);
  const handleBook = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId, expertId }) });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally { setLoading(false); }
  };
  return (
    <button onClick={handleBook} disabled={loading} style={{
      backgroundColor: "#0A3323", color: "#839958",
      border: "none", borderRadius: 8, padding: "7px 14px",
      fontSize: 12, fontWeight: 700, cursor: loading ? "default" : "pointer",
      opacity: loading ? 0.7 : 1, whiteSpace: "nowrap",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {loading ? "…" : `Book · ${formatINR(price)}`}
    </button>
  );
}

/* ─── Expert Card ────────────────────────────────────────────────── */
function ExpertCard({ expert }: { expert: Expert }) {
  const bg = avatarBg(expert.id);
  const initials = expert.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const activeServices = expert.services?.filter(s => s.is_active) ?? [];

  return (
    <div style={{
      backgroundColor: "#fff", border: "1px solid #e8e4ce",
      borderRadius: 16, overflow: "hidden",
      transition: "box-shadow 0.2s, border-color 0.2s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLDivElement).style.borderColor = "#c8c4ae"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = "#e8e4ce"; }}
    >
      {/* Card header with gradient band */}
      <div style={{ background: `linear-gradient(135deg, ${bg}aa 0%, ${bg}33 100%)`, padding: "18px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: 14, backgroundColor: bg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: "#1a1a1a", flexShrink: 0,
            border: "2px solid rgba(255,255,255,0.6)",
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>{expert.full_name}</p>
              {expert.is_verified && <span style={{ fontSize: 14 }}>✓</span>}
            </div>
            {expert.headline && (
              <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {expert.headline}
              </p>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
              <span style={{ fontSize: 12, color: "#1a1a1a", fontWeight: 600 }}>
                ⭐ {expert.rating.toFixed(1)}
                <span style={{ fontWeight: 400, color: "#839958" }}> ({expert.review_count})</span>
              </span>
              <span style={{ fontSize: 11, color: "#839958" }}>{expert.years_experience} yrs exp</span>
            </div>
          </div>

          {activeServices.length > 0 && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: "#839958", margin: 0 }}>from</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#0A3323", margin: 0 }}>
                {formatINR(Math.min(...activeServices.map(s => s.price_cents)))}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 20px 18px" }}>
        {/* Expertise tags */}
        {expert.expertise_areas?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {expert.expertise_areas.slice(0, 4).map(area => (
              <span key={area} style={{ fontSize: 11, backgroundColor: "#f5f5f0", color: "#555", borderRadius: 99, padding: "3px 10px", fontWeight: 500 }}>
                {area}
              </span>
            ))}
          </div>
        )}

        {/* Services */}
        {activeServices.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {activeServices.slice(0, 3).map(service => (
              <div key={service.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                backgroundColor: "#fafaf8", borderRadius: 10, padding: "10px 12px",
                border: "1px solid #f0efe8",
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {service.title}
                  </p>
                  <p style={{ fontSize: 11, color: "#839958", margin: "2px 0 0" }}>
                    {service.duration_mins} min · {service.type}
                  </p>
                </div>
                <BookButton serviceId={service.id} expertId={expert.id} label={service.title} price={service.price_cents} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "#b0ab8c", marginBottom: 14 }}>No services listed yet.</p>
        )}

        <Link href={`/experts/${expert.id}`} style={{
          display: "block", textAlign: "center", fontSize: 12, color: "#839958",
          textDecoration: "none", paddingTop: 10, borderTop: "1px solid #f0efe8",
        }}>
          View full profile →
        </Link>
      </div>
    </div>
  );
}

/* ─── My Sessions panel ──────────────────────────────────────────── */
function MySessionsPanel({ bookings, loading }: { bookings: Booking[]; loading: boolean }) {
  const upcoming = bookings.filter(b => ["confirmed", "pending"].includes(b.status) && b.scheduled_at && new Date(b.scheduled_at) > new Date());
  const past = bookings.filter(b => b.status === "completed" || new Date(b.scheduled_at ?? "0") < new Date());
  const next = upcoming[0] ?? null;

  if (loading) return (
    <div style={{ padding: 24 }}>
      <p style={{ fontSize: 13, color: "#839958" }}>Loading your sessions…</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%", overflowY: "auto" }}>
      {/* Next up */}
      {next ? (
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #e8e4ce" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 10px" }}>Next up</p>
          <div style={{
            background: "linear-gradient(135deg, #0A3323 0%, #1a5c3a 100%)",
            borderRadius: 14, padding: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#F7F4D5", flexShrink: 0 }}>
                {next.expert?.full_name[0] ?? "?"}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#F7F4D5", margin: 0 }}>{next.expert?.full_name}</p>
                <p style={{ fontSize: 11, color: "rgba(247,244,213,0.6)", margin: 0 }}>{next.service?.title}</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#c8e6b0", margin: "0 0 12px", fontWeight: 600 }}>
              🗓 {next.scheduled_at ? formatDate(next.scheduled_at) : "Time TBD"} · {next.service?.duration_mins ?? next.duration_mins} min
            </p>
            {next.meeting_url ? (
              <a href={next.meeting_url} target="_blank" rel="noopener noreferrer" style={{
                display: "block", textAlign: "center", backgroundColor: "#839958",
                color: "#0A3323", borderRadius: 9, padding: "9px 0",
                fontSize: 13, fontWeight: 800, textDecoration: "none",
              }}>
                📹 Join call
              </a>
            ) : (
              <div style={{ textAlign: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 9, padding: "9px 0", fontSize: 12, color: "rgba(247,244,213,0.5)" }}>
                Link will appear here
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: "20px 20px 0", borderBottom: upcoming.length === 0 ? "1px solid #e8e4ce" : "none" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 10px" }}>Upcoming</p>
          <div style={{ backgroundColor: "#fafaf8", border: "1px dashed #e8e4ce", borderRadius: 12, padding: "20px 16px", textAlign: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 22, margin: "0 0 6px" }}>📅</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", margin: "0 0 4px" }}>No upcoming sessions</p>
            <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>Book time with an expert on the left</p>
          </div>
        </div>
      )}

      {/* More upcoming */}
      {upcoming.length > 1 && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e8e4ce" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 10px" }}>Also upcoming</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {upcoming.slice(1).map(b => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        </div>
      )}

      {/* Past sessions */}
      {past.length > 0 && (
        <div style={{ padding: "16px 20px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 10px" }}>Past sessions</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {past.map(b => <BookingRow key={b.id} booking={b} />)}
          </div>
        </div>
      )}

      {bookings.length === 0 && !loading && (
        <div style={{ padding: "20px 20px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#839958", textTransform: "uppercase", letterSpacing: "0.6px", margin: "0 0 10px" }}>Past sessions</p>
          <p style={{ fontSize: 12, color: "#b0ab8c" }}>Sessions you've completed will appear here.</p>
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const status = STATUS_STYLE[booking.status] ?? STATUS_STYLE.completed;
  return (
    <div style={{ backgroundColor: "#fafaf8", border: "1px solid #f0efe8", borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", margin: 0, flex: 1 }}>{booking.expert?.full_name ?? "Expert"}</p>
        <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: status.bg, color: status.color, borderRadius: 99, padding: "2px 8px" }}>
          {status.label}
        </span>
      </div>
      <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>{booking.service?.title}</p>
      {booking.scheduled_at && (
        <p style={{ fontSize: 11, color: "#b0ab8c", margin: "3px 0 0" }}>
          {new Date(booking.scheduled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      )}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function SessionsPage() {
  const supabase = createClient();
  const { session } = useSession();

  const [experts, setExperts] = useState<Expert[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expertsLoading, setExpertsLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");

  // Load experts
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("experts").select("*, services(*)").eq("is_active", true).order("rating", { ascending: false });
      setExperts((data as Expert[]) ?? []);
      setExpertsLoading(false);
    })();
  }, [supabase]);

  // Load bookings
  useEffect(() => {
    if (!session?.user.id) { setBookingsLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select("*, expert:experts(full_name, headline), service:services(title, duration_mins, type)")
        .eq("user_id", session.user.id)
        .order("scheduled_at", { ascending: true });

      const raw = (data ?? []) as Array<Omit<Booking, "expert" | "service"> & {
        expert: Booking["expert"] | Booking["expert"][];
        service: Booking["service"] | Booking["service"][];
      }>;
      setBookings(raw.map(b => ({
        ...b,
        expert: Array.isArray(b.expert) ? b.expert[0] : b.expert,
        service: Array.isArray(b.service) ? b.service[0] : b.service,
      })));
      setBookingsLoading(false);
    })();
  }, [session?.user.id, supabase]);

  // All expertise areas across experts for filter chips
  const allAreas = useMemo(() => {
    const set = new Set<string>();
    experts.forEach(e => e.expertise_areas?.forEach(a => set.add(a)));
    return Array.from(set).slice(0, 8);
  }, [experts]);

  // Filter experts
  const filtered = useMemo(() => {
    return experts.filter(e => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        e.full_name.toLowerCase().includes(q) ||
        e.headline?.toLowerCase().includes(q) ||
        e.expertise_areas?.some(a => a.toLowerCase().includes(q));
      const matchFilter = activeFilter === "All" || e.expertise_areas?.includes(activeFilter);
      return matchSearch && matchFilter;
    });
  }, [experts, search, activeFilter]);

  const upcomingCount = bookings.filter(b =>
    ["confirmed", "pending"].includes(b.status) && b.scheduled_at && new Date(b.scheduled_at) > new Date()
  ).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px)", maxWidth: 1100, margin: "0 auto" }}>

      {/* ── Page header ── */}
      <div style={{ paddingBottom: 20, borderBottom: "1px solid #e8e4ce", flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0A3323", margin: "0 0 4px" }}>Sessions</h1>
        <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>
          Book 1:1 time with experts who've been where you want to go.
        </p>
      </div>

      {/* ── Split layout ── */}
      <div style={{ display: "flex", gap: 24, flex: 1, overflow: "hidden", paddingTop: 20 }}>

        {/* ── LEFT: Expert discovery ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Search + filters */}
          <div style={{ flexShrink: 0, marginBottom: 16 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, role, or expertise…"
              style={{
                width: "100%", boxSizing: "border-box", border: "1px solid #e8e4ce",
                borderRadius: 10, padding: "10px 14px", fontSize: 13,
                backgroundColor: "#fff", outline: "none", marginBottom: 10,
                fontFamily: "inherit", color: "#1a1a1a",
              }}
              onFocus={e => (e.target.style.borderColor = "#0A3323")}
              onBlur={e => (e.target.style.borderColor = "#e8e4ce")}
            />

            {/* Filter chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["All", ...allAreas].map(area => (
                <button key={area} onClick={() => setActiveFilter(area)} style={{
                  fontSize: 11, fontWeight: activeFilter === area ? 700 : 500,
                  backgroundColor: activeFilter === area ? "#0A3323" : "#f5f5f0",
                  color: activeFilter === area ? "#839958" : "#666",
                  border: "none", borderRadius: 99, padding: "5px 12px",
                  cursor: "pointer", transition: "all 0.12s",
                }}>
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Expert list */}
          <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
            {expertsLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ backgroundColor: "#fff", border: "1px solid #e8e4ce", borderRadius: 16, height: 200, opacity: 0.5 }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ fontSize: 32, margin: "0 0 12px" }}>🔍</p>
                <p style={{ fontSize: 14, color: "#839958" }}>No experts match your search.</p>
                <button onClick={() => { setSearch(""); setActiveFilter("All"); }} style={{ marginTop: 12, fontSize: 12, color: "#0A3323", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 20 }}>
                {filtered.map(expert => <ExpertCard key={expert.id} expert={expert} />)}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: My sessions ── */}
        <div style={{
          width: 300, flexShrink: 0, backgroundColor: "#fff",
          border: "1px solid #e8e4ce", borderRadius: 16,
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          {/* Panel header */}
          <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid #e8e4ce", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>My Sessions</p>
              {upcomingCount > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, backgroundColor: "#0A3323", color: "#839958", borderRadius: 99, padding: "2px 8px" }}>
                  {upcomingCount} upcoming
                </span>
              )}
            </div>
          </div>

          {!session ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#839958", marginBottom: 12 }}>Sign in to see your booked sessions.</p>
            </div>
          ) : (
            <MySessionsPanel bookings={bookings} loading={bookingsLoading} />
          )}
        </div>
      </div>
    </div>
  );
}
