import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Profile, Goal, Booking, Expert, Milestone } from "@/types";

// ─── XP & levels ─────────────────────────────────────────────────────────────
const LEVELS = [
  { min: 0,    max: 199,     label: "Beginner", next: 200  },
  { min: 200,  max: 499,     label: "Explorer", next: 500  },
  { min: 500,  max: 999,     label: "Achiever", next: 1000 },
  { min: 1000, max: 1999,    label: "Pro",      next: 2000 },
  { min: 2000, max: Infinity, label: "Expert",  next: 2000 },
];

function calcXP(profile: Profile | null, goals: Goal[], bookings: { status: string }[]) {
  let xp = 0;
  if (profile) {
    const fields = [profile.full_name, profile.bio, profile.location, profile.current_role, profile.target_role, profile.industry, profile.linkedin_url];
    xp += fields.filter(Boolean).length * 15;
    xp += Math.min((profile.skills ?? []).length * 5, 50);
  }
  for (const g of goals) {
    if (g.status === "active")    xp += 50;
    if (g.status === "completed") xp += 200;
  }
  for (const b of bookings) {
    if (b.status === "confirmed" || b.status === "completed") xp += 100;
  }
  return xp;
}

function getLevel(xp: number) {
  let idx = LEVELS.findIndex((l) => xp >= l.min && xp <= l.max);
  if (idx === -1) idx = LEVELS.length - 1;
  const l = LEVELS[idx];
  const progress = idx === LEVELS.length - 1 ? 100 : Math.round(((xp - l.min) / (l.next - l.min)) * 100);
  return { num: idx + 1, label: l.label, xp, next: l.next, progress, nextLabel: LEVELS[idx + 1]?.label ?? "Expert" };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(raw: string) { return raw.split(" ")[0]; }

function daysLeft(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

function goalProgress(goal: Goal) {
  const ms = (goal.milestones ?? []) as Milestone[];
  if (ms.length > 0) return Math.round(ms.filter((m) => m.completed).length / ms.length * 100);
  if (goal.target_date) {
    const total   = new Date(goal.target_date).getTime() - new Date(goal.created_at).getTime();
    const elapsed = Date.now() - new Date(goal.created_at).getTime();
    return Math.min(100, Math.max(0, Math.round(elapsed / total * 100)));
  }
  return 0;
}

function buildStreakDots(dates: string[]) {
  const LTRS = ["S","M","T","W","T","F","S"];
  const today = new Date(); today.setHours(0,0,0,0);
  const active = new Set(dates.map((d) => { const dt = new Date(d); dt.setHours(0,0,0,0); return dt.getTime(); }));
  return Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(today); dt.setDate(today.getDate() - (6 - i));
    const isToday  = dt.getTime() === today.getTime();
    const isDone   = !isToday && active.has(dt.getTime());
    return { letter: LTRS[dt.getDay()], isToday, isDone };
  });
}

const AVATAR_FILLS = ["#FDE68A", "#C4B5FD", "#00C9A7"];
const CAREER_PATHS = [
  { label: "Product Manager",  bg: "#FDE68A", color: "#1a1a1a" },
  { label: "Growth",           bg: "#C4B5FD", color: "#1a1a1a" },
  { label: "Founder's Office", bg: "#00C9A7", color: "#1B3A35" },
  { label: "Strategy",         bg: "#1B3A35", color: "#00C9A7" },
];
const DEFAULT_MS = [
  { title: "Resume",    completed: false, isActive: true  },
  { title: "Interview", completed: false, isActive: false },
  { title: "Offer",     completed: false, isActive: false },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const userId = session.user.id;

  const [profileRes, goalsRes, upcomingRes, doneCountRes, expertsRes, activityRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*, expert:experts(full_name), service:services(title)")
      .eq("user_id", userId)
      .in("status", ["confirmed", "pending"])
      .order("scheduled_at", { ascending: true })
      .limit(3),
    supabase.from("bookings").select("id", { count: "exact" }).eq("user_id", userId).eq("status", "completed"),
    supabase.from("experts").select("id,full_name,headline,rating,review_count,expertise_areas").eq("is_active", true).order("rating", { ascending: false }).limit(3),
    supabase.from("bookings").select("created_at").eq("user_id", userId).gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
  ]);

  const profile       = profileRes.data as Profile | null;
  const allGoals      = (goalsRes.data ?? []) as Goal[];
  const upcomingBooks = (upcomingRes.data ?? []) as Booking[];
  const sessionsDone  = doneCountRes.count ?? 0;
  const experts       = (expertsRes.data ?? []) as Expert[];
  const recentDates   = (activityRes.data ?? []).map((r: { created_at: string }) => r.created_at);

  if (!profile?.current_role) redirect("/welcome");

  const activeGoals = allGoals.filter((g) => g.status === "active");
  const xp          = calcXP(profile, allGoals, upcomingBooks);
  const level       = getLevel(xp);
  const streakDots  = buildStreakDots(recentDates);
  const streak      = streakDots.filter((d) => d.isDone || d.isToday).length;

  const rawName     = profile?.full_name ?? (session.user.email ?? "there").split("@")[0];
  const displayName = firstName(rawName);

  const firstGoal = activeGoals[0] ?? null;
  const goalPct   = firstGoal ? goalProgress(firstGoal) : 0;
  const goalDays  = firstGoal ? daysLeft(firstGoal.target_date) : null;
  const daysToGoal = goalDays ?? 0;

  const storedMs = (firstGoal?.milestones ?? []) as Milestone[];
  const chips = storedMs.length > 0
    ? storedMs.map((m: Milestone, i: number) => ({
        key: m.id ?? i,
        title: m.title,
        completed: m.completed,
        isActive: !m.completed && storedMs.findIndex((x: Milestone) => !x.completed) === i,
      }))
    : DEFAULT_MS.map((m, i) => ({ key: i, ...m }));

  // Weekly quest mock from active goal or generic
  const questName  = firstGoal?.title ?? "Profile Audit";
  const questDone  = chips.filter((c) => c.completed).length;
  const questTotal = chips.length;

  const xpToNext = level.next - level.xp;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", opacity: 0, animation: "fadeUp 0.4s ease forwards" }}>

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#1a1a1a", margin: 0 }}>
          {getGreeting()}, {displayName} 👋
        </h1>
        <p style={{ fontSize: "13px", color: "#888888", marginTop: "4px" }}>
          You&apos;re on a {streak}-day streak. Don&apos;t break it today.
        </p>
      </div>

      {/* ── XP Hero card ─────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: "#1B3A35",
        borderRadius: "16px",
        padding: "24px",
        display: "flex",
        gap: "24px",
        alignItems: "stretch",
      }}>
        {/* Left: progress */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Level badge */}
          <span style={{
            display: "inline-flex", alignItems: "center",
            backgroundColor: "#00C9A7", color: "#1B3A35",
            fontSize: "10px", fontWeight: 800,
            borderRadius: "99px", padding: "3px 10px",
            alignSelf: "flex-start", letterSpacing: "0.5px",
          }}>
            LEVEL {level.num} · {level.label.toUpperCase()}
          </span>
          <div>
            <p style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff", margin: 0 }}>
              {xpToNext > 0 ? `${xpToNext} XP to Level ${level.num + 1}` : "Max level reached!"}
            </p>
            <p style={{ fontSize: "12px", color: "rgba(0,201,167,0.8)", marginTop: "4px" }}>
              Complete a mock interview to earn +100 XP
            </p>
          </div>
          {/* XP bar */}
          <div>
            <div style={{ height: "8px", borderRadius: "99px", backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${level.progress}%`, backgroundColor: "#00C9A7", borderRadius: "99px", transition: "width 0.7s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>{level.xp} / {level.next} XP</span>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)" }}>Level {level.num + 1}: {level.nextLabel}</span>
            </div>
          </div>
        </div>

        {/* Centre: big XP number */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: "100px" }}>
          <div style={{ fontSize: "40px", fontWeight: 800, color: "#FDE68A", lineHeight: 1 }}>{level.xp}</div>
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", marginTop: "4px", textAlign: "center" }}>total XP<br />earned</div>
        </div>

        {/* Right: Weekly quest */}
        <div style={{
          backgroundColor: "#FDE68A",
          borderRadius: "12px",
          padding: "14px 16px",
          minWidth: "160px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}>
          <p style={{ fontSize: "10px", fontWeight: 800, color: "#1a1a1a", letterSpacing: "0.5px", margin: 0, textTransform: "uppercase" }}>
            Weekly Quest
          </p>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
            {questName.length > 20 ? questName.slice(0, 20) + "…" : questName}
          </p>
          <p style={{ fontSize: "11px", color: "#888888", margin: 0 }}>
            {questDone} / {questTotal} tasks done
          </p>
          {/* mini progress */}
          <div style={{ height: "4px", borderRadius: "99px", backgroundColor: "rgba(0,0,0,0.1)", overflow: "hidden", marginTop: "4px" }}>
            <div style={{ height: "100%", width: `${questTotal > 0 ? Math.round(questDone / questTotal * 100) : 0}%`, backgroundColor: "#1B3A35", borderRadius: "99px" }} />
          </div>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { accent: "#00C9A7", val: activeGoals.length, label: "Active goals",  badge: activeGoals.length > 0 ? "In progress" : "Start one!" },
          { accent: "#C4B5FD", val: `${streak}🔥`,      label: "Day streak",    badge: streak > 0 ? "Active" : "Begin today" },
          { accent: "#FDE68A", val: sessionsDone,        label: "Sessions done", badge: "Completed" },
          { accent: "#1B3A35", val: daysToGoal,          label: "Days to goal",  badge: daysToGoal < 30 ? "This month!" : "On track" },
        ].map(({ accent, val, label, badge }) => (
          <div key={label} style={{
            backgroundColor: "#ffffff",
            border: "1px solid #eeeeee",
            borderRadius: "14px",
            padding: "16px",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Top accent bar */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", backgroundColor: accent }} />
            {/* Top-right badge */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
              <span style={{
                fontSize: "10px", fontWeight: 600,
                backgroundColor: "#FAF7F2", color: "#888888",
                borderRadius: "99px", padding: "2px 8px",
              }}>
                {badge}
              </span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#1a1a1a", lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: "11px", color: "#888888", marginTop: "4px" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Two-column: goal (60%) + sessions (40%) ──────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "16px" }}>

        {/* LEFT: Active goal */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #eeeeee", borderRadius: "16px", padding: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#888888", letterSpacing: "0.5px", textTransform: "uppercase", margin: 0 }}>
              Active Goal
            </p>
            <Link href="/goals" style={{ fontSize: "12px", fontWeight: 600, color: "#00C9A7", textDecoration: "none" }}>Edit</Link>
          </div>

          {firstGoal ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "#1a1a1a", flex: 1, margin: 0 }}>{firstGoal.title}</p>
                <span style={{
                  fontSize: "11px", fontWeight: 600,
                  backgroundColor: "#C4B5FD", color: "#1a1a1a",
                  borderRadius: "99px", padding: "3px 10px",
                  textTransform: "capitalize", whiteSpace: "nowrap",
                }}>
                  {firstGoal.category}
                </span>
              </div>
              <div>
                <div style={{ height: "8px", borderRadius: "99px", backgroundColor: "#f0f0f0", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${goalPct}%`, backgroundColor: "#00C9A7", borderRadius: "99px" }} />
                </div>
                <p style={{ fontSize: "10px", color: "#888888", marginTop: "5px" }}>
                  {goalPct}%{goalDays !== null ? ` · ${goalDays} days left` : ""}
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {chips.map((c) => (
                  <span key={c.key} style={{
                    fontSize: "10px", fontWeight: 600,
                    padding: "5px 10px", borderRadius: "8px",
                    backgroundColor: c.completed ? "#FDE68A" : c.isActive ? "#1B3A35" : "#f0f0f0",
                    color:           c.completed ? "#1a1a1a"  : c.isActive ? "#00C9A7"  : "#aaaaaa",
                  }}>
                    {c.title}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px" }}>
              <p style={{ fontSize: "13px", color: "#888888", margin: 0 }}>No active goals. Setting one earns you 50 XP.</p>
              <Link href="/goals" style={{
                display: "inline-flex", alignItems: "center",
                backgroundColor: "#FDE68A", color: "#1a1a1a",
                fontSize: "13px", fontWeight: 700,
                borderRadius: "8px", padding: "10px 18px",
                textDecoration: "none",
              }}>
                Set your first goal →
              </Link>
            </div>
          )}
        </div>

        {/* RIGHT: Sessions */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #eeeeee", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#888888", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "14px" }}>
            Sessions
          </p>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
            {upcomingBooks.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#888888", margin: 0 }}>No upcoming sessions.</p>
            ) : (
              upcomingBooks.map((b) => {
                const expertName   = (b.expert as { full_name: string } | null)?.full_name ?? "Expert";
                const serviceTitle = (b.service as { title: string } | null)?.title ?? "Session";
                const dt           = b.scheduled_at ? new Date(b.scheduled_at) : null;
                return (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "38px", height: "44px", flexShrink: 0,
                      backgroundColor: "#FDE68A", borderRadius: "8px",
                      display: "flex", flexDirection: "column",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: "16px", fontWeight: 800, color: "#1a1a1a", lineHeight: 1 }}>{dt ? dt.getDate() : "–"}</span>
                      <span style={{ fontSize: "8px", fontWeight: 700, color: "#1a1a1a99", textTransform: "uppercase" }}>
                        {dt ? dt.toLocaleDateString("en-US", { month: "short" }) : ""}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "12px", fontWeight: 700, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{serviceTitle}</p>
                      <p style={{ fontSize: "11px", color: "#888888", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{expertName}</p>
                    </div>
                    <button style={{
                      flexShrink: 0,
                      backgroundColor: "#1B3A35", color: "#00C9A7",
                      fontSize: "11px", fontWeight: 700,
                      borderRadius: "8px", padding: "5px 10px",
                      border: "none", cursor: "pointer",
                    }}>
                      Join
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Streak dots */}
          <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid #eeeeee", display: "flex", gap: "6px", justifyContent: "space-between" }}>
            {streakDots.map((d, i) => (
              <div key={i} style={{
                width: "22px", height: "22px",
                borderRadius: "6px",
                backgroundColor: d.isDone ? "#1B3A35" : d.isToday ? "#FDE68A" : "#f0f0f0",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "9px", fontWeight: 700,
                color: d.isDone ? "#00C9A7" : "#1a1a1a99",
              }}>
                {d.letter}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Career paths ─────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #eeeeee", borderRadius: "16px", padding: "22px" }}>
        <p style={{ fontSize: "10px", fontWeight: 700, color: "#888888", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "14px" }}>
          Career Paths for You
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {CAREER_PATHS.map(({ label, bg, color }) => (
            <Link key={label} href="/experts" style={{
              display: "inline-block",
              backgroundColor: bg, color,
              fontSize: "12px", fontWeight: 700,
              borderRadius: "99px", padding: "8px 18px",
              textDecoration: "none",
            }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Top Experts ──────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#ffffff", border: "1px solid #eeeeee", borderRadius: "16px", padding: "22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "#888888", letterSpacing: "0.5px", textTransform: "uppercase", margin: 0 }}>
            Top Experts
          </p>
          <Link href="/experts" style={{ fontSize: "13px", fontWeight: 600, color: "#00C9A7", textDecoration: "none" }}>
            Browse all →
          </Link>
        </div>

        {experts.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#888888" }}>No experts yet.</p>
        ) : (
          <div>
            {experts.map((e, i) => {
              const initials = e.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
              const avatarBg = AVATAR_FILLS[i % AVATAR_FILLS.length];
              const tag = e.expertise_areas?.[0] ?? (e.headline ?? "").split(" ").slice(0, 4).join(" ");
              return (
                <div key={e.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0" }}>
                    <div style={{
                      width: "36px", height: "36px", flexShrink: 0,
                      backgroundColor: avatarBg, color: "#1a1a1a",
                      borderRadius: "10px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "13px", fontWeight: 700,
                    }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.full_name}</p>
                      {tag && <p style={{ fontSize: "11px", color: "#888888", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tag}</p>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                      <span style={{ fontSize: "11px", color: "#888888" }}>★ {e.rating.toFixed(1)}</span>
                      <Link href={`/experts/${e.id}`} style={{
                        backgroundColor: "#1B3A35", color: "#00C9A7",
                        fontSize: "11px", fontWeight: 700,
                        borderRadius: "8px", padding: "5px 14px",
                        textDecoration: "none",
                      }}>
                        Book
                      </Link>
                    </div>
                  </div>
                  {i < experts.length - 1 && <div style={{ height: "1px", backgroundColor: "#eeeeee" }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
