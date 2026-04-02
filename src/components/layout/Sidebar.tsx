"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import type { Profile } from "@/types";
import { useEffect, useRef, useState } from "react";

// ─── Level system ─────────────────────────────────────────────────────────────

type LevelEntry = { level: number; name: string; min: number; next: number | null };

const LEVELS: LevelEntry[] = [
  { level: 1, name: "Rookie",       min: 0,    next: 200  },
  { level: 2, name: "Explorer",     min: 200,  next: 500  },
  { level: 3, name: "Practitioner", min: 500,  next: 1000 },
  { level: 4, name: "Expert",       min: 1000, next: 2000 },
  { level: 5, name: "Master",       min: 2000, next: null },
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
  for (const l of LEVELS) { if (xp >= l.min) current = l; }
  const nextLevel = current.level < 5 ? LEVELS[current.level] : null;
  const progress  = nextLevel ? (xp - current.min) / (nextLevel.min - current.min) : 1;
  const toNext    = nextLevel ? nextLevel.min - xp : 0;
  return { current, nextLevel, progress, toNext };
}

// ─── Nav items (5 top-level) ──────────────────────────────────────────────────

type NavItem = { label: string; href: string; icon: string; matchPrefixes: string[] };

const NAV: NavItem[] = [
  { label: "Feed",      href: "/feed",        icon: "🏠", matchPrefixes: ["/feed", "/dashboard"]             },
  { label: "Groups",    href: "/communities",  icon: "👥", matchPrefixes: ["/communities"]                    },
  { label: "Jobs",      href: "/jobs",         icon: "💼", matchPrefixes: ["/jobs", "/tracker", "/companies"] },
  { label: "Assistant", href: "/assistant",    icon: "✨", matchPrefixes: ["/assistant"]                      },
  { label: "Profile",   href: "/profile",      icon: "👤", matchPrefixes: ["/profile", "/settings"]           },
];

function isNavActive(item: NavItem, pathname: string): boolean {
  return item.matchPrefixes.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

// ─── Inner content ────────────────────────────────────────────────────────────

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();
  const { session }  = useSession();
  const { profile }  = useProfile();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  };

  const email       = session?.user?.email ?? "";
  const displayName = profile?.full_name ?? email.split("@")[0] ?? "You";
  const firstName   = displayName.split(" ")[0];
  const initials    = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  const xp = calcXP(profile ?? null);
  const { current: currentLevel, nextLevel, progress, toNext } = getLevelInfo(xp);

  return (
    <div style={{
      width: 225,
      height: "100vh",
      backgroundColor: "#ffffff",
      borderRight: "1px solid #e8e4ce",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Logo ── */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #e8e4ce", flexShrink: 0 }}>
        <Link
          href="/feed"
          onClick={onNavigate}
          style={{ fontSize: 18, fontWeight: 800, color: "#0A3323", textDecoration: "none", display: "block" }}
        >
          mentor<span style={{ color: "#D3968C" }}>.</span>
        </Link>
      </div>

      {/* ── Nav items ── */}
      <div style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
        {NAV.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                textDecoration: "none",
                marginBottom: 2,
                backgroundColor: active ? "#F7F4D5" : "transparent",
                color: active ? "#0A3323" : "#555",
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
              {item.label}
              {active && (
                <span style={{
                  marginLeft: "auto",
                  width: 6, height: 6, borderRadius: "50%",
                  backgroundColor: "#0A3323",
                  flexShrink: 0,
                }} />
              )}
            </Link>
          );
        })}

        {/* ── Divider + quick links ── */}
        <div style={{ borderTop: "1px solid #e8e4ce", margin: "12px 4px", paddingTop: 12 }}>
          {[
            { href: "/bookings",  label: "My sessions" },
            { href: "/experts",   label: "Find experts" },
            { href: "/refer",     label: "Invite friends" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              style={{
                display: "block",
                fontSize: 12,
                color: "#839958",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: 8,
                fontWeight: 500,
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── XP footer + avatar ── */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid #e8e4ce", flexShrink: 0 }}>
        {/* XP bar */}
        <div style={{ backgroundColor: "#0A3323", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: "#F7F4D5", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 700 }}>
              Lv {currentLevel.level} · {currentLevel.name}
            </span>
            <span style={{ fontSize: 11, color: "#D3968C", fontWeight: 800 }}>{xp} XP</span>
          </div>
          <div style={{ height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden", marginBottom: 4 }}>
            <div style={{ height: "100%", width: `${Math.min(progress * 100, 100)}%`, backgroundColor: "#D3968C", borderRadius: 99 }} />
          </div>
          <div style={{ fontSize: 9, color: "rgba(247,244,213,0.4)" }}>
            {nextLevel ? `${toNext} XP to Lv ${nextLevel.level}` : "Max level · Master"}
          </div>
        </div>

        {/* Avatar + dropdown */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <div
            onClick={() => setDropdownOpen((o) => !o)}
            style={{
              backgroundColor: "#F9F7EC", borderRadius: 10, padding: "9px 12px",
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none",
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              backgroundColor: "#D3968C", color: "#ffffff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>
              {initials || "?"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0A3323", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10, color: "#839958" }}>{firstName}</div>
            </div>
            <span style={{ fontSize: 9, color: "#839958", flexShrink: 0 }}>{dropdownOpen ? "▲" : "▼"}</span>
          </div>

          {dropdownOpen && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
              backgroundColor: "#ffffff", border: "1px solid #e8e4ce",
              borderRadius: 10, padding: 6, zIndex: 100,
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            }}>
              <Link href="/profile"  onClick={() => { setDropdownOpen(false); onNavigate?.(); }} className="sidebar-dropdown-item">Edit profile</Link>
              <Link href="/settings" onClick={() => { setDropdownOpen(false); onNavigate?.(); }} className="sidebar-dropdown-item">Settings</Link>
              <div style={{ height: 1, backgroundColor: "#e8e4ce", margin: "4px 0" }} />
              <button onClick={handleSignOut} className="sidebar-dropdown-item" style={{ width: "100%", background: "none", border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}>
                Sign out
              </button>
            </div>
          )}
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
      {/* Desktop: sticky in-flow */}
      <div className="sidebar-desktop">
        <div style={{ position: "sticky", top: 0 }}>
          <SidebarContent />
        </div>
      </div>

      {/* Mobile: hamburger */}
      <button className="sidebar-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">☰</button>

      {/* Mobile: slide-in drawer */}
      <div className="sidebar-mobile" style={{ transform: mobileOpen ? "translateX(0)" : "translateX(-240px)" }}>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </div>

      {/* Mobile: backdrop */}
      <div className={`sidebar-backdrop${mobileOpen ? " sidebar-backdrop-visible" : ""}`} onClick={() => setMobileOpen(false)} />
    </>
  );
}
