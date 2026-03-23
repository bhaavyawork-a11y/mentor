"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import type { Profile } from "@/types";
import { useEffect, useState } from "react";

// ─── Level system ─────────────────────────────────────────────────────────────

type LevelEntry = { level: number; name: string; min: number; next: number | null };

const LEVELS: LevelEntry[] = [
  { level: 1, name: "Rookie",        min: 0,    next: 200  },
  { level: 2, name: "Explorer",      min: 200,  next: 500  },
  { level: 3, name: "Practitioner",  min: 500,  next: 1000 },
  { level: 4, name: "Expert",        min: 1000, next: 2000 },
  { level: 5, name: "Master",        min: 2000, next: null },
];

function calcXP(profile: Profile | null): number {
  if (!profile) return 0;
  const fields = [
    profile.full_name, profile.bio, profile.location,
    profile.current_job_role, profile.target_role, profile.industry, profile.linkedin_url,
  ];
  return (
    fields.filter(Boolean).length * 15 +
    Math.min((profile.skills ?? []).length * 5, 50) +
    (profile.interview_xp ?? 0)
  );
}

function getLevelInfo(xp: number) {
  let current: LevelEntry = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.min) current = l;
  }
  const nextLevel = current.level < 5 ? LEVELS[current.level] : null;
  const progress  = nextLevel ? (xp - current.min) / (nextLevel.min - current.min) : 1;
  const toNext    = nextLevel ? nextLevel.min - xp : 0;
  return { current, nextLevel, progress, toNext };
}

// ─── Nav structure ────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  badgeKey?: string;
  newBadge?: boolean;
};

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/goals",     label: "My goals",  badgeKey: "goals"    },
      { href: "/bookings",  label: "Sessions",  badgeKey: "bookings" },
    ],
  },
  {
    label: "AI tools — free",
    items: [
      { href: "/resume",         label: "Resume builder"  },
      { href: "/mock-interview", label: "Mock interview"  },
      { href: "/questions",      label: "Question bank"   },
      { href: "/offer",          label: "Offer evaluator" },
    ],
  },
  {
    label: "Job search",
    items: [
      { href: "/jobs",      label: "Jobs for you",        newBadge: true },
      { href: "/tracker",   label: "Application tracker"              },
      { href: "/companies", label: "Companies"                        },
      { href: "/salaries",  label: "Salary data"                      },
    ],
  },
  {
    label: "Community",
    items: [
      { href: "/communities", label: "My circles", badgeKey: "communities" },
      { href: "/refer",       label: "Referrals"                           },
    ],
  },
  {
    label: "Experts",
    items: [
      { href: "/experts",            label: "Browse experts" },
      { href: "/experts?service=dm", label: "Priority DM"    },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/profile",  label: "Profile"  },
      { href: "/settings", label: "Settings" },
    ],
  },
];

// ─── Inner content (shared between desktop & mobile) ─────────────────────────

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const { session } = useSession();
  const { profile }  = useProfile();

  const [goalCount,    setGoalCount]    = useState<number | null>(null);
  const [bookingCount, setBookingCount] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    const uid = session.user.id;

    supabase
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .neq("status", "completed")
      .then(({ count }) => { if (count) setGoalCount(count); });

    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .gte("scheduled_at", new Date().toISOString())
      .then(({ count }) => { if (count) setBookingCount(count); });
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const email       = session?.user?.email ?? "";
  const displayName = profile?.full_name ?? email.split("@")[0] ?? "You";
  const firstName   = displayName.split(" ")[0];
  const initials    = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  const xp = calcXP(profile ?? null);
  const { current: currentLevel, nextLevel, progress, toNext } = getLevelInfo(xp);

  const badgeCounts: Record<string, number | null> = {
    goals:       goalCount,
    bookings:    bookingCount,
    communities: null,
  };

  function isActive(href: string) {
    const base = href.split("?")[0];
    if (base === "/dashboard") return pathname === "/dashboard";
    return pathname === base || pathname.startsWith(base + "/");
  }

  return (
    <div style={{
      width: 240,
      height: "100vh",
      backgroundColor: "#ffffff",
      borderRight: "1px solid #e8e4ce",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #e8e4ce", flexShrink: 0 }}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          style={{ fontSize: 18, fontWeight: 800, color: "#0A3323", textDecoration: "none", display: "block" }}
        >
          mentor<span style={{ color: "#D3968C" }}>.</span>
        </Link>

        <div style={{
          marginTop: 14,
          backgroundColor: "#F9F7EC", borderRadius: 10, padding: "10px 12px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            backgroundColor: "#D3968C", color: "#ffffff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800, flexShrink: 0,
          }}>
            {initials || "?"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: "#0A3323", lineHeight: 1.2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {displayName}
            </div>
            <div style={{ fontSize: 10, color: "#839958", marginTop: 2 }}>
              Level {currentLevel.level} · {firstName}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 10px", flex: 1, overflowY: "auto" }}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "#bbb",
              textTransform: "uppercase", letterSpacing: "0.8px",
              padding: "8px 10px 4px",
            }}>
              {section.label}
            </div>

            {section.items.map((item) => {
              const active = isActive(item.href);
              const count  = item.badgeKey ? badgeCounts[item.badgeKey] : null;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`sidebar-nav-item${active ? " sidebar-nav-item-active" : ""}`}
                >
                  <span>{item.label}</span>
                  <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {count !== null && count > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        backgroundColor: "#D3968C", color: "#fff",
                        borderRadius: 99, padding: "1px 6px", minWidth: 16, textAlign: "center",
                      }}>
                        {count}
                      </span>
                    )}
                    {item.newBadge && (
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        backgroundColor: "#F7F4D5", color: "#0A3323",
                        border: "1px solid #0A3323", borderRadius: 99, padding: "1px 6px",
                      }}>
                        New
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Sign out */}
        <div style={{ marginTop: 4 }}>
          <button
            onClick={handleSignOut}
            className="sidebar-nav-item"
            style={{ width: "100%", border: "none", background: "transparent", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Footer XP card */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid #e8e4ce", flexShrink: 0 }}>
        <div style={{ backgroundColor: "#0A3323", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: "#F7F4D5", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 700 }}>
              Level {currentLevel.level} · {firstName}
            </span>
            <span style={{ fontSize: 12, color: "#D3968C", fontWeight: 800 }}>
              {xp} XP
            </span>
          </div>
          <div style={{
            height: 5, backgroundColor: "rgba(255,255,255,0.1)",
            borderRadius: 99, overflow: "hidden", marginBottom: 6,
          }}>
            <div style={{
              height: "100%", width: `${Math.min(progress * 100, 100)}%`,
              backgroundColor: "#D3968C", borderRadius: 99,
            }} />
          </div>
          <div style={{ fontSize: 10, color: "rgba(247,244,213,0.4)" }}>
            {nextLevel
              ? `${toNext} XP to Level ${nextLevel.level} · ${nextLevel.name}`
              : "Max level reached · Master"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Exported Sidebar ─────────────────────────────────────────────────────────

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop: in-flow sticky */}
      <div className="sidebar-desktop">
        <div style={{ position: "sticky", top: 0 }}>
          <SidebarContent />
        </div>
      </div>

      {/* Mobile: hamburger button */}
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>

      {/* Mobile: slide-in drawer */}
      <div
        className="sidebar-mobile"
        style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-240px)" }}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Mobile: backdrop */}
      <div
        className={`sidebar-backdrop${mobileOpen ? " sidebar-backdrop-visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      />
    </>
  );
}
