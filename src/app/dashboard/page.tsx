import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Profile, Goal, Booking, Expert, Milestone } from "@/types";

// ─── XP ──────────────────────────────────────────────────────────────────────
function calcXP(profile: Profile | null, goals: Goal[], bookings: { status: string }[]) {
  let xp = 0;
  if (profile) {
    const fields = [profile.full_name, profile.bio, profile.location, profile.current_role, profile.target_role, profile.industry, profile.linkedin_url];
    xp += fields.filter(Boolean).length * 15;
    xp += Math.min((profile.skills ?? []).length * 5, 50);
  }
  for (const g of goals) {
    if (g.status === "active") xp += 50;
    if (g.status === "completed") xp += 200;
  }
  for (const b of bookings) {
    if (b.status === "confirmed" || b.status === "completed") xp += 100;
  }
  return xp;
}

const LEVELS = [
  { min: 0,    max: 199,       label: "Beginner",  next: 200  },
  { min: 200,  max: 499,       label: "Explorer",  next: 500  },
  { min: 500,  max: 999,       label: "Achiever",  next: 1000 },
  { min: 1000, max: 1999,      label: "Pro",       next: 2000 },
  { min: 2000, max: Infinity,  label: "Expert",    next: 2000 },
];

function getLevel(xp: number) {
  const idx = Math.max(0, LEVELS.findIndex((l) => xp >= l.min && xp <= l.max));
  const safe = idx === -1 ? LEVELS.length - 1 : idx;
  const level = LEVELS[safe];
  const progress = safe === LEVELS.length - 1 ? 100
    : Math.round(((xp - level.min) / (level.next - level.min)) * 100);
  return { number: safe + 1, label: level.label, xp, next: level.next, progress, min: level.min };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string) {
  return name.split(" ")[0];
}

function daysLeft(iso: string | null) {
  if (!iso) return null;
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return Math.max(0, d);
}

function goalProgress(goal: Goal) {
  const ms = goal.milestones ?? [];
  if (ms.length > 0) {
    return Math.round((ms.filter((m: Milestone) => m.completed).length / ms.length) * 100);
  }
  if (goal.target_date) {
    const total = new Date(goal.target_date).getTime() - new Date(goal.created_at).getTime();
    const elapsed = Date.now() - new Date(goal.created_at).getTime();
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }
  return 0;
}

/** Last 7 days: which had any booking/goal activity */
function buildStreakDots(activityDates: string[]) {
  const DAY_LETTERS = ["S","M","T","W","T","F","S"];
  const today = new Date(); today.setHours(0,0,0,0);
  const activeDays = new Set(activityDates.map((d) => {
    const dt = new Date(d); dt.setHours(0,0,0,0); return dt.getTime();
  }));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(today); dt.setDate(today.getDate() - (6 - i));
    const isToday = dt.getTime() === today.getTime();
    const isFuture = dt.getTime() > today.getTime();
    const isDone = !isToday && !isFuture && activeDays.has(dt.getTime());
    return { letter: DAY_LETTERS[dt.getDay()], isToday, isFuture, isDone };
  });
}

const AVATAR_FILLS = ["#EDE986", "#E7BEF8", "#93ABD9"];
const CAREER_PATHS = [
  { label: "Product Manager",    bg: "#EDE986", color: "#0f0f0f" },
  { label: "Growth",             bg: "#E7BEF8", color: "#0f0f0f" },
  { label: "Founder's Office",   bg: "#93ABD9", color: "#0f0f0f" },
  { label: "Strategy",           bg: "#F2619C", color: "#ffffff" },
];
const DEFAULT_MILESTONES = ["Resume", "Interview", "Offer"];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const userId = session.user.id;

  const [profileRes, goalsRes, upcomingRes, completedCountRes, expertsRes, activityRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*, expert:experts(full_name, headline), service:services(title, duration_mins)")
      .eq("user_id", userId)
      .in("status", ["confirmed", "pending"])
      .order("scheduled_at", { ascending: true })
      .limit(3),
    supabase.from("bookings").select("id", { count: "exact" }).eq("user_id", userId).eq("status", "completed"),
    supabase.from("experts").select("id,full_name,headline,rating,review_count,is_verified,expertise_areas").eq("is_active", true).order("rating", { ascending: false }).limit(3),
    supabase.from("bookings").select("created_at").eq("user_id", userId).gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
  ]);

  const profile        = profileRes.data as Profile | null;
  const allGoals       = (goalsRes.data ?? []) as Goal[];
  const upcomingBooks  = (upcomingRes.data ?? []) as Booking[];
  const sessionsDone   = completedCountRes.count ?? 0;
  const experts        = (expertsRes.data ?? []) as Expert[];
  const recentDates    = (activityRes.data ?? []).map((r: { created_at: string }) => r.created_at);

  // Redirect new/incomplete users to welcome
  if (!profile?.current_role) redirect("/welcome");

  const activeGoals = allGoals.filter((g) => g.status === "active");
  const xp    = calcXP(profile, allGoals, upcomingBooks);
  const level = getLevel(xp);
  const streakDots = buildStreakDots(recentDates);
  const streak = streakDots.filter((d) => d.isDone || d.isToday).length;

  const displayName = profile?.full_name ?? session.user.email?.split("@")[0] ?? "there";
  const firstGoal   = activeGoals[0] ?? null;
  const goalPct     = firstGoal ? goalProgress(firstGoal) : 0;
  const goalDays    = firstGoal ? daysLeft(firstGoal.target_date) : null;
  const goalMs      = firstGoal?.milestones ?? [];

  return (
    <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Level pill */}
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold"
          style={{ background: "#EDE986", color: "#0f0f0f" }}
        >
          Level {level.number} · {level.label}
        </span>

        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f0f0f", lineHeight: 1.15 }}>
          {getGreeting()}, {firstName(displayName)} 👋
        </h1>

        {/* XP bar */}
        <div className="space-y-1.5">
          <div className="rounded-full overflow-hidden" style={{ height: "10px", background: "#f0f0f0" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${level.progress}%`, background: "#F2619C" }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[11px]" style={{ color: "#888" }}>
              {level.xp} / {level.next} XP
            </span>
            <span className="text-[11px]" style={{ color: "#888" }}>
              {level.number < 5 ? `Level ${level.number + 1}: ${LEVELS[level.number]?.label}` : "Max level!"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats row — coloured fills, NOT white cards ────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { bg: "#EDE986", color: "#0f0f0f", val: activeGoals.length, label: "Active goals" },
          { bg: "#E7BEF8", color: "#0f0f0f", val: sessionsDone,       label: "Sessions done" },
          { bg: "#93ABD9", color: "#0f0f0f", val: level.xp,           label: "Total XP"      },
          { bg: "#F2619C", color: "#ffffff",  val: streak,             label: "Days streak"   },
        ].map(({ bg, color, val, label }) => (
          <div
            key={label}
            style={{ background: bg, borderRadius: "14px", padding: "16px" }}
          >
            <div style={{ fontSize: "32px", fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: "11px", color, opacity: 0.75, marginTop: "4px" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Two column grid ───────────────────────────────────────── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: "2fr 1fr" }}>

        {/* LEFT: Active goal */}
        <div className="card" style={{ padding: "22px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#888", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "12px" }}>
            Active Goal
          </p>

          {firstGoal ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 flex-wrap">
                <p style={{ fontSize: "16px", fontWeight: 800, color: "#0f0f0f", flex: 1 }}>
                  {firstGoal.title}
                </p>
                <span
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg capitalize shrink-0"
                  style={{ background: "#E7BEF8", color: "#0f0f0f" }}
                >
                  {firstGoal.category}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="rounded-full overflow-hidden" style={{ height: "10px", background: "#f0f0f0" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${goalPct}%`, background: "#F2619C" }}
                  />
                </div>
                <p style={{ fontSize: "11px", color: "#888" }}>
                  {goalPct}%{goalDays !== null && ` · ${goalDays} days left`}
                </p>
              </div>

              {/* Milestone chips */}
              <div className="flex flex-wrap gap-2">
                {(goalMs.length > 0 ? goalMs : DEFAULT_MILESTONES.map((t, i) => ({ id: i, title: t, completed: false }))).map((m: Milestone | { id: number; title: string; completed: boolean }, i: number) => {
                  const isCompleted = (m as Milestone).completed;
                  const isActive    = !isCompleted && i === goalMs.findIndex((x: Milestone) => !x.completed);
                  return (
                    <span
                      key={(m as Milestone).id ?? i}
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        padding: "5px 10px",
                        borderRadius: "8px",
                        background: isCompleted ? "#EDE986" : isActive ? "#F2619C" : "#f0f0f0",
                        color:      isCompleted ? "#0f0f0f"  : isActive ? "#ffffff"  : "#888",
                      }}
                    >
                      {(m as Milestone).title}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 py-4">
              <p style={{ fontSize: "13px", color: "#888" }}>No active goals yet. Setting one earns you 50 XP.</p>
              <Link
                href="/goals"
                className="inline-flex items-center gap-1 px-5 py-3 rounded-xl font-bold text-[13px] transition-all"
                style={{ background: "#EDE986", color: "#0f0f0f" }}
              >
                Set your first goal →
              </Link>
            </div>
          )}
        </div>

        {/* RIGHT: Sessions */}
        <div className="card flex flex-col" style={{ padding: "22px" }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#888", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "12px" }}>
            Sessions
          </p>

          <div className="flex-1 space-y-3">
            {upcomingBooks.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#888" }}>No upcoming sessions.</p>
            ) : (
              upcomingBooks.map((b) => {
                const expertName   = (b.expert as { full_name: string } | null)?.full_name ?? "Expert";
                const serviceTitle = (b.service as { title: string } | null)?.title ?? "Session";
                const dt           = b.scheduled_at ? new Date(b.scheduled_at) : null;
                return (
                  <div key={b.id} className="flex items-center gap-3">
                    {/* Date badge */}
                    <div
                      className="shrink-0 flex flex-col items-center justify-center rounded-lg"
                      style={{ width: "36px", height: "40px", background: "#EDE986" }}
                    >
                      <span style={{ fontSize: "15px", fontWeight: 800, color: "#0f0f0f", lineHeight: 1 }}>
                        {dt ? dt.getDate() : "–"}
                      </span>
                      <span style={{ fontSize: "8px", fontWeight: 700, color: "#0f0f0f88", textTransform: "uppercase" }}>
                        {dt ? dt.toLocaleDateString("en-US", { month: "short" }) : ""}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#0f0f0f" }} className="truncate">{serviceTitle}</p>
                      <p style={{ fontSize: "11px", color: "#888" }} className="truncate">{expertName}</p>
                    </div>
                    <button
                      className="shrink-0 rounded-lg text-[11px] font-bold transition-all"
                      style={{ background: "#0f0f0f", color: "#ffffff", padding: "5px 10px" }}
                    >
                      Join
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Streak dots */}
          <div className="mt-4 pt-4 flex gap-1.5 justify-between" style={{ borderTop: "1px solid #f5f5f5" }}>
            {streakDots.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-center rounded-[6px]"
                style={{
                  width: "22px", height: "22px",
                  background: d.isDone ? "#F2619C" : d.isToday ? "#EDE986" : "#f0f0f0",
                  fontSize: "9px",
                  fontWeight: 700,
                  color: d.isDone ? "#ffffff" : "#0f0f0f88",
                }}
              >
                {d.letter}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Career paths ─────────────────────────────────────────── */}
      <div className="card" style={{ padding: "22px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#888", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "14px" }}>
          Career Paths for You
        </p>
        <div className="flex flex-wrap gap-3">
          {CAREER_PATHS.map(({ label, bg, color }) => (
            <Link
              key={label}
              href="/experts"
              className="transition-opacity hover:opacity-80"
              style={{
                background: bg, color,
                borderRadius: "99px",
                fontSize: "12px", fontWeight: 700,
                padding: "8px 18px",
                display: "inline-block",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Top Experts ──────────────────────────────────────────── */}
      <div className="card" style={{ padding: "22px" }}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#888", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Top Experts
          </p>
          <Link href="/experts" style={{ fontSize: "13px", fontWeight: 600, color: "#F2619C" }}>
            Browse all →
          </Link>
        </div>

        <div className="space-y-0">
          {experts.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#888" }}>No experts yet.</p>
          ) : (
            experts.map((e, i) => {
              const initials = e.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
              const avatarBg = AVATAR_FILLS[i % AVATAR_FILLS.length];
              const tag = e.expertise_areas?.[0] ?? e.headline?.split(" ").slice(0, 3).join(" ") ?? "";
              return (
                <div key={e.id}>
                  <div className="flex items-center gap-3 py-3">
                    <div
                      className="shrink-0 flex items-center justify-center rounded-[10px] font-bold text-[13px]"
                      style={{ width: "36px", height: "36px", background: avatarBg, color: "#0f0f0f" }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#0f0f0f" }} className="truncate">{e.full_name}</p>
                      {tag && <p style={{ fontSize: "11px", color: "#888" }} className="truncate">{tag}</p>}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span style={{ fontSize: "11px", color: "#888" }}>★ {e.rating.toFixed(1)}</span>
                      <Link
                        href={`/experts/${e.id}`}
                        style={{ background: "#F2619C", color: "#ffffff", fontSize: "11px", fontWeight: 700, borderRadius: "8px", padding: "5px 14px" }}
                        className="transition-opacity hover:opacity-80"
                      >
                        Book
                      </Link>
                    </div>
                  </div>
                  {i < experts.length - 1 && (
                    <div style={{ height: "1px", background: "#f5f5f5" }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
