import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Profile, Goal, Milestone } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    const isToday = dt.getTime() === today.getTime();
    const isDone  = !isToday && active.has(dt.getTime());
    return { letter: LTRS[dt.getDay()], isToday, isDone };
  });
}

// ─── Static data ──────────────────────────────────────────────────────────────

const DEFAULT_CHIPS = [
  { title: "Resume",    completed: false, isActive: true  },
  { title: "Referral",  completed: false, isActive: false },
  { title: "Interview", completed: false, isActive: false },
  { title: "Offer",     completed: false, isActive: false },
];

const SEED_CONNECTIONS = [
  { name: "Arjun Kapoor", role: "Chief of Staff", company: "Zepto"    },
  { name: "Priya Singh",  role: "PM",             company: "Razorpay" },
];

const CONNECTION_AVATAR_COLORS = ["#D3968C", "#839958"];

const PREP_TOOLS = [
  { icon: "📝", label: "Resume builder",  href: "/resume"         },
  { icon: "🎙️", label: "Mock interview",   href: "/mock-interview" },
  { icon: "❓", label: "Question bank",    href: "/questions"      },
  { icon: "💰", label: "Salary checker",   href: "/salaries"       },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const userId = session.user.id;

  const [profileRes, goalsRes, expertsRes, activityRes, referralRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("experts").select("id,full_name,headline,expertise_areas").eq("is_active", true).order("rating", { ascending: false }).limit(2),
    supabase.from("bookings").select("created_at").eq("user_id", userId).gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
    supabase.from("referrals").select("id", { count: "exact" }).eq("referrer_id", userId),
  ]);

  const profile        = profileRes.data as Profile | null;
  const allGoals       = (goalsRes.data ?? []) as Goal[];
  const recentDates    = (activityRes.data ?? []).map((r: { created_at: string }) => r.created_at);
  const referralCount  = referralRes.count ?? 0;

  if (!profile?.current_job_role) redirect("/welcome");

  const activeGoals  = allGoals.filter((g) => g.status === "active");
  const streakDots   = buildStreakDots(recentDates);
  const streak       = streakDots.filter((d) => d.isDone || d.isToday).length;
  const rawName      = profile?.full_name ?? (session.user.email ?? "there").split("@")[0];
  const displayName  = firstName(rawName);

  const firstGoal  = activeGoals[0] ?? null;
  const goalPct    = firstGoal ? goalProgress(firstGoal) : 0;
  const goalDays   = firstGoal ? daysLeft(firstGoal.target_date) : null;
  const daysToGoal = goalDays ?? 0;

  const storedMs = (firstGoal?.milestones ?? []) as Milestone[];
  const chips = storedMs.length > 0
    ? storedMs.map((m: Milestone, i: number) => ({
        key: m.id ?? i,
        title: m.title,
        completed: m.completed,
        isActive: !m.completed && storedMs.findIndex((x: Milestone) => !x.completed) === i,
      }))
    : DEFAULT_CHIPS.map((m, i) => ({ key: i, ...m }));

  // Referral connection rows — use real experts if available, else seed
  const experts = expertsRes.data ?? [];
  const connections = experts.length >= 2
    ? experts.slice(0, 2).map((e: { full_name: string; expertise_areas?: string[]; headline?: string | null }) => ({
        name:    e.full_name,
        role:    e.expertise_areas?.[0] ?? "Expert",
        company: (e.headline ?? "").split("·").slice(-1)[0]?.trim() || "Top Company",
      }))
    : SEED_CONNECTIONS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── Greeting ── */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#0A3323", margin: 0 }}>
          {getGreeting()}, {displayName} 👋
        </h1>
        <p style={{ fontSize: "13px", color: "#839958", marginTop: "4px" }}>
          {profile?.target_role
            ? `Join a circle to find referral connections at ${profile.target_role} companies.`
            : "Join a circle to find referral connections at your target companies."}
        </p>
      </div>

      {/* ── Referral hero card ── */}
      <div style={{
        backgroundColor: "#0A3323", borderRadius: "16px", padding: "20px 24px",
        display: "flex", gap: "24px", alignItems: "center",
      }}>
        {/* Left */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
          <span style={{
            display: "inline-flex", alignItems: "center",
            backgroundColor: "#D3968C", color: "#ffffff",
            fontSize: "9px", fontWeight: 800, textTransform: "uppercase",
            borderRadius: "99px", padding: "3px 10px", letterSpacing: "0.5px",
            alignSelf: "flex-start",
          }}>
            NEW REFERRAL OPPORTUNITIES
          </span>
          <p style={{ fontSize: "18px", fontWeight: 800, color: "#F7F4D5", margin: 0, lineHeight: 1.3 }}>
            {profile?.target_role
              ? `Find referral connections for ${profile.target_role} roles`
              : "Find referral connections in your circles"}
          </p>
          <p style={{ fontSize: "12px", color: "rgba(247,244,213,0.5)", margin: 0 }}>
            Active in your circles this week
          </p>
        </div>

        {/* Right: mini connection rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "260px" }}>
          {connections.map((c, i) => {
            const inits = c.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div key={c.name} style={{
                backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "8px", padding: "8px 10px",
                display: "flex", alignItems: "center", gap: "8px",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  backgroundColor: CONNECTION_AVATAR_COLORS[i % CONNECTION_AVATAR_COLORS.length],
                  color: "#ffffff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800,
                }}>
                  {inits}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "11px", fontWeight: 800, color: "#F7F4D5", margin: 0 }}>{c.name}</p>
                  <p style={{ fontSize: "10px", color: "rgba(247,244,213,0.45)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.role} · {c.company}
                  </p>
                </div>
                <Link href="/communities" style={{
                  fontSize: "10px", fontWeight: 700,
                  backgroundColor: "#D3968C", color: "#ffffff",
                  borderRadius: "6px", padding: "4px 10px", textDecoration: "none",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  Connect
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { accent: "#D3968C", val: referralCount,    label: "Referral connections", badge: referralCount > 0 ? "Active" : "Find some!" },
          { accent: "#0A3323", val: 0,                label: "Circles joined",       badge: "Join one →"                               },
          { accent: "#839958", val: `${streak}🔥`,   label: "Day streak",           badge: streak > 0 ? "Active" : "Begin today"       },
          { accent: "#105666", val: daysToGoal,       label: "Days to goal",         badge: daysToGoal < 30 ? "This month!" : "On track" },
        ].map(({ accent, val, label, badge }) => (
          <div key={label} style={{
            backgroundColor: "#ffffff", border: "1px solid #e8e4ce",
            borderRadius: "14px", padding: "16px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", backgroundColor: accent }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
              <span style={{
                fontSize: "10px", fontWeight: 600,
                backgroundColor: "#F9F7EC", color: "#839958",
                borderRadius: "99px", padding: "2px 8px",
              }}>
                {badge}
              </span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#1a1a1a", lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: "11px", color: "#839958", marginTop: "4px" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Two-column: My circles + Referral connections ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

        {/* LEFT: My circles */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e8e4ce", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#839958", letterSpacing: "0.5px", textTransform: "uppercase", margin: 0 }}>
              MY CIRCLES
            </p>
            <Link href="/communities" style={{ fontSize: "12px", fontWeight: 600, color: "#839958", textDecoration: "none" }}>Browse all →</Link>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "13px", color: "#839958", margin: 0, lineHeight: 1.6 }}>
              Join a circle to find referral connections at your target companies.
            </p>
            <Link href="/communities" style={{
              alignSelf: "flex-start",
              fontSize: "12px", fontWeight: 700,
              backgroundColor: "#0A3323", color: "#F7F4D5",
              borderRadius: "8px", padding: "9px 18px", textDecoration: "none",
            }}>
              Find your circle →
            </Link>
          </div>
        </div>

        {/* RIGHT: Referral connections */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e8e4ce", borderRadius: "16px", padding: "22px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#839958", letterSpacing: "0.5px", textTransform: "uppercase", margin: 0 }}>
              REFERRAL CONNECTIONS
            </p>
            <Link href="/communities" style={{ fontSize: "12px", fontWeight: 600, color: "#839958", textDecoration: "none" }}>Find more</Link>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
            <p style={{ fontSize: "13px", color: "#839958", margin: 0, lineHeight: 1.6 }}>
              No referral connections yet. Join circles to find people who can refer you.
            </p>
            <Link href="/communities" style={{
              alignSelf: "flex-start",
              fontSize: "12px", fontWeight: 700,
              backgroundColor: "#F9F7EC", color: "#0A3323",
              border: "1px solid #e8e4ce",
              borderRadius: "8px", padding: "9px 18px", textDecoration: "none",
            }}>
              Join a circle →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom row: Active goal + Prep tools ── */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "16px" }}>

        {/* LEFT: Active goal */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e8e4ce", borderRadius: "16px", padding: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#839958", letterSpacing: "0.5px", textTransform: "uppercase", margin: 0 }}>
              Active Goal
            </p>
            <Link href="/goals" style={{ fontSize: "12px", fontWeight: 600, color: "#839958", textDecoration: "none" }}>Edit</Link>
          </div>

          {firstGoal ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <p style={{ fontSize: "16px", fontWeight: 800, color: "#1a1a1a", flex: 1, margin: 0 }}>{firstGoal.title}</p>
                <span style={{
                  fontSize: "11px", fontWeight: 600,
                  backgroundColor: "#D3968C", color: "#ffffff",
                  borderRadius: "99px", padding: "3px 10px",
                  textTransform: "capitalize", whiteSpace: "nowrap",
                }}>
                  {firstGoal.category}
                </span>
              </div>
              <div>
                <div style={{ height: "8px", borderRadius: "99px", backgroundColor: "#e8e4ce", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${goalPct}%`, backgroundColor: "#839958", borderRadius: "99px" }} />
                </div>
                <p style={{ fontSize: "10px", color: "#839958", marginTop: "5px" }}>
                  {goalPct}%{goalDays !== null ? ` · ${goalDays} days left` : ""}
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {chips.map((c) => (
                  <span key={c.key} style={{
                    fontSize: "10px", fontWeight: 600,
                    padding: "5px 10px", borderRadius: "8px",
                    backgroundColor: c.completed ? "#F7F4D5" : c.isActive ? "#0A3323" : "#e8e4ce",
                    color:           c.completed ? "#1a1a1a"  : c.isActive ? "#839958"  : "#b0ab8c",
                  }}>
                    {c.title}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px" }}>
              <p style={{ fontSize: "13px", color: "#839958", margin: 0 }}>No active goals. Set one to track your journey.</p>
              <Link href="/goals" style={{
                alignSelf: "flex-start",
                backgroundColor: "#F7F4D5", color: "#1a1a1a",
                fontSize: "13px", fontWeight: 700,
                borderRadius: "8px", padding: "10px 18px",
                textDecoration: "none",
              }}>
                Set your first goal →
              </Link>
            </div>
          )}
        </div>

        {/* RIGHT: Prep tools */}
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #e8e4ce", borderRadius: "16px", padding: "22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <p style={{ fontSize: "10px", fontWeight: 700, color: "#839958", letterSpacing: "0.5px", textTransform: "uppercase", margin: 0 }}>
              PREP TOOLS
            </p>
            <Link href="/resume" style={{ fontSize: "12px", fontWeight: 600, color: "#839958", textDecoration: "none" }}>All free →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {PREP_TOOLS.map(({ icon, label, href }) => (
              <Link
                key={label}
                href={href}
                style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  textDecoration: "none", padding: "7px 0",
                  borderBottom: "1px solid #F9F7EC",
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: "8px",
                  backgroundColor: "#F7F4D5",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, flexShrink: 0,
                }}>
                  {icon}
                </div>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a", flex: 1 }}>{label}</span>
                <span style={{
                  fontSize: "10px", fontWeight: 700,
                  backgroundColor: "#F9F7EC", color: "#839958",
                  borderRadius: "99px", padding: "2px 8px",
                }}>
                  Free
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
