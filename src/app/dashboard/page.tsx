import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Profile, Goal, Booking, Expert } from "@/types";

// ─── XP Calculation ─────────────────────────────────────────────────────────
function calcXP(profile: Profile | null, goals: Goal[], bookings: Booking[]) {
  let xp = 0;

  // Profile completeness: 15 XP per filled field
  if (profile) {
    const fields = [
      profile.full_name,
      profile.bio,
      profile.location,
      profile.current_role,
      profile.target_role,
      profile.industry,
      profile.linkedin_url,
    ];
    xp += fields.filter(Boolean).length * 15;
    // Skills: 5 XP each, capped at 50
    xp += Math.min((profile.skills ?? []).length * 5, 50);
  }

  // Goals: active = 50 XP, completed = 200 XP
  for (const g of goals) {
    if (g.status === "active") xp += 50;
    if (g.status === "completed") xp += 200;
  }

  // Bookings: confirmed or completed = 100 XP each
  for (const b of bookings) {
    if (b.status === "confirmed" || b.status === "completed") xp += 100;
  }

  return xp;
}

const LEVELS = [
  { min: 0,    max: 199,  label: "Beginner",  next: 200  },
  { min: 200,  max: 499,  label: "Explorer",  next: 500  },
  { min: 500,  max: 999,  label: "Achiever",  next: 1000 },
  { min: 1000, max: 1999, label: "Pro",       next: 2000 },
  { min: 2000, max: Infinity, label: "Expert", next: 2000 },
];

function getLevel(xp: number) {
  const lvl = LEVELS.findIndex((l) => xp >= l.min && xp <= l.max);
  const idx = lvl === -1 ? LEVELS.length - 1 : lvl;
  const level = LEVELS[idx];
  const progress = idx === LEVELS.length - 1
    ? 100
    : Math.round(((xp - level.min) / (level.next - level.min)) * 100);
  return { number: idx + 1, label: level.label, xp, next: level.next, progress };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function fmtPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const userId = session.user.id;

  // Parallel data fetching
  const [profileRes, goalsRes, bookingsRes, expertsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("goals").select("*").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*, expert:experts(full_name, headline, avatar_url), service:services(title, duration_mins, price_cents, currency)")
      .eq("user_id", userId)
      .in("status", ["confirmed", "pending"])
      .order("scheduled_at", { ascending: true })
      .limit(2),
    supabase
      .from("experts")
      .select("*")
      .eq("is_active", true)
      .order("rating", { ascending: false })
      .limit(3),
  ]);

  const profile  = profileRes.data as Profile | null;
  const goals    = (goalsRes.data ?? []) as Goal[];
  const bookings = (bookingsRes.data ?? []) as Booking[];
  const experts  = (expertsRes.data ?? []) as Expert[];

  // Also fetch all bookings for XP calculation
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("status")
    .eq("user_id", userId);

  const xpData = calcXP(profile, goals, (allBookings ?? []) as Booking[]);
  const level  = getLevel(xpData);

  const displayName = profile?.full_name ?? session.user.email?.split("@")[0] ?? "there";
  const activeGoals = goals.slice(0, 3);

  return (
    <div className="space-y-8 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>

      {/* ── Header ── */}
      <div>
        <p className="text-[13px] mb-1" style={{ color: "#0f0f0f99" }}>
          {getGreeting()} 👋
        </p>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f0f0f" }}>
          {displayName}
        </h1>
        {profile?.current_role && (
          <p className="text-[13px] mt-1" style={{ color: "#0f0f0f66" }}>
            {profile.current_role}
            {profile.target_role && (
              <> → <span style={{ color: "#F2619C" }}>{profile.target_role}</span></>
            )}
          </p>
        )}
      </div>

      {/* ── XP / Level Card ── */}
      <div className="card" style={{ padding: "24px" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold"
              style={{ background: "#F2619C", color: "#ffffff" }}
            >
              {level.number}
            </div>
            <div>
              <p style={{ fontSize: "15px", fontWeight: 800, color: "#0f0f0f" }}>
                Level {level.number} — {level.label}
              </p>
              <p className="text-[11px]" style={{ color: "#0f0f0f66" }}>
                {level.number < 5
                  ? `${level.next - level.xp} XP to Level ${level.number + 1}`
                  : "Max level reached!"}
              </p>
            </div>
          </div>
          <div
            className="px-3 py-1.5 rounded-full text-[11px] font-bold"
            style={{ background: "#EDE986", color: "#0f0f0f" }}
          >
            {level.xp} XP
          </div>
        </div>
        {/* Progress bar */}
        <div className="rounded-full overflow-hidden" style={{ height: "6px", background: "#f0f0f0" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${level.progress}%`, background: "#F2619C" }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[11px]" style={{ color: "#0f0f0f66" }}>
            {LEVELS[level.number - 1]?.min ?? 0} XP
          </span>
          <span className="text-[11px]" style={{ color: "#0f0f0f66" }}>
            {level.next} XP
          </span>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          value={goals.length}
          label="Active goals"
          accent="#E7BEF8"
        />
        <StatCard
          value={bookings.length}
          label="Upcoming sessions"
          accent="#93ABD9"
        />
        <StatCard
          value={level.xp}
          label="Total XP earned"
          accent="#EDE986"
        />
      </div>

      {/* ── Active Goals ── */}
      <Section
        title="Active Goals"
        href="/goals"
        linkLabel="All goals"
        empty={activeGoals.length === 0}
        emptyText="No active goals. Set one to start earning XP."
      >
        <div className="space-y-3">
          {activeGoals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} />
          ))}
        </div>
      </Section>

      {/* ── Upcoming Bookings ── */}
      <Section
        title="Upcoming Sessions"
        href="/bookings"
        linkLabel="All bookings"
        empty={bookings.length === 0}
        emptyText="No upcoming sessions."
      >
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </div>
      </Section>

      {/* ── Top Experts ── */}
      <Section
        title="Top Experts"
        href="/experts"
        linkLabel="Browse all"
        empty={experts.length === 0}
        emptyText="No experts yet."
      >
        <div className="grid md:grid-cols-3 gap-4">
          {experts.map((e) => (
            <ExpertCard key={e.id} expert={e} />
          ))}
        </div>
      </Section>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="card" style={{ padding: "18px" }}>
      <div
        className="text-[26px] font-extrabold leading-none mb-1"
        style={{ color: "#0f0f0f" }}
      >
        {value}
      </div>
      <div className="text-[11px]" style={{ color: "#0f0f0f66" }}>
        {label}
      </div>
      <div
        className="mt-3 h-1 rounded-full"
        style={{ background: accent }}
      />
    </div>
  );
}

function Section({
  title, href, linkLabel, children, empty, emptyText,
}: {
  title: string; href: string; linkLabel: string;
  children: React.ReactNode; empty: boolean; emptyText: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontSize: "18px", fontWeight: 800, color: "#0f0f0f" }}>{title}</h2>
        <Link
          href={href}
          className="text-[13px] font-medium transition-colors"
          style={{ color: "#F2619C" }}
        >
          {linkLabel} →
        </Link>
      </div>
      {empty ? (
        <div className="card text-center" style={{ padding: "32px" }}>
          <p className="text-[13px]" style={{ color: "#0f0f0f66" }}>{emptyText}</p>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  role: "#E7BEF8",
  skill: "#93ABD9",
  salary: "#EDE986",
  network: "#F2619C22",
  education: "#E7BEF8",
  other: "#f0f0f0",
};

function GoalRow({ goal }: { goal: Goal }) {
  const color = CATEGORY_COLORS[goal.category] ?? "#f0f0f0";
  return (
    <div className="card flex items-center gap-4" style={{ padding: "14px 18px" }}>
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: "#F2619C" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate" style={{ color: "#0f0f0f" }}>
          {goal.title}
        </p>
        {goal.target_date && (
          <p className="text-[11px] mt-0.5" style={{ color: "#0f0f0f66" }}>
            Due {new Date(goal.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>
      <span
        className="text-[11px] font-medium px-2.5 py-1 rounded-lg capitalize shrink-0"
        style={{ background: color, color: "#0f0f0f" }}
      >
        {goal.category}
      </span>
    </div>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const expertName = (booking.expert as Expert | null)?.full_name ?? "Expert";
  const serviceTitle = (booking.service as { title: string } | null)?.title ?? "Session";
  const priceCents = (booking.service as { price_cents: number } | null)?.price_cents ?? booking.amount_cents ?? 0;
  const currency = (booking.service as { currency: string } | null)?.currency ?? booking.currency ?? "USD";

  return (
    <div className="card flex items-center gap-4" style={{ padding: "14px 18px" }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[13px] font-bold"
        style={{ background: "#93ABD9", color: "#0f0f0f" }}
      >
        {expertName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium" style={{ color: "#0f0f0f" }}>{serviceTitle}</p>
        <p className="text-[11px]" style={{ color: "#0f0f0f66" }}>
          with {expertName}
          {booking.scheduled_at && ` · ${fmtDate(booking.scheduled_at)}`}
        </p>
      </div>
      <div className="shrink-0 text-right">
        {priceCents > 0 && (
          <p className="text-[13px] font-bold" style={{ color: "#0f0f0f" }}>
            {fmtPrice(priceCents, currency)}
          </p>
        )}
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-md capitalize"
          style={{
            background: booking.status === "confirmed" ? "#EDE986" : "#f0f0f0",
            color: "#0f0f0f",
          }}
        >
          {booking.status}
        </span>
      </div>
    </div>
  );
}

function ExpertCard({ expert }: { expert: Expert }) {
  const initials = expert.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link href={`/experts/${expert.id}`} className="card block transition-shadow hover:shadow-card-hover" style={{ padding: "18px" }}>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[13px] font-bold"
          style={{ background: "#E7BEF8", color: "#0f0f0f" }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold truncate" style={{ color: "#0f0f0f" }}>
            {expert.full_name}
          </p>
          {expert.is_verified && (
            <p className="text-[11px]" style={{ color: "#F2619C" }}>✓ Verified</p>
          )}
        </div>
      </div>
      {expert.headline && (
        <p className="text-[11px] leading-relaxed line-clamp-2 mb-3" style={{ color: "#0f0f0f66" }}>
          {expert.headline}
        </p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span style={{ color: "#EDE986", fontSize: "13px" }}>★</span>
          <span className="text-[11px] font-medium" style={{ color: "#0f0f0f" }}>
            {expert.rating.toFixed(1)}
          </span>
          <span className="text-[11px]" style={{ color: "#0f0f0f66" }}>
            ({expert.review_count})
          </span>
        </div>
        <span
          className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
          style={{ background: "#F2619C", color: "#ffffff" }}
        >
          Book
        </span>
      </div>
    </Link>
  );
}
