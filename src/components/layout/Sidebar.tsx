"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import { useEffect, useRef, useState } from "react";

// ─── Nav items ────────────────────────────────────────────────────────────────

type NavItem = { label: string; href: string; icon: string; matchPrefixes: string[] };

const NAV: NavItem[] = [
  { label: "Groups",    href: "/communities",  icon: "👥", matchPrefixes: ["/communities"]                              },
  { label: "Messages",  href: "/messages",     icon: "💬", matchPrefixes: ["/messages"]                                 },
  { label: "Profile",   href: "/profile",      icon: "👤", matchPrefixes: ["/profile", "/settings"]                    },
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
  const { session } = useSession();
  const { profile } = useProfile();

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

  return (
    <div style={{
      width: 225,
      height: "100vh",
      backgroundColor: "#181C24",
      borderRight: "1px solid #1F2937",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Logo ── */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #1F2937", flexShrink: 0 }}>
        <Link
          href="/communities"
          onClick={onNavigate}
          style={{ fontSize: 18, fontWeight: 800, color: "#F9FAFB", textDecoration: "none", display: "block" }}
        >
          mentor<span style={{ color: "#5B8AFF" }}>.</span>
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
                backgroundColor: active ? "rgba(26,58,143,0.3)" : "transparent",
                color: active ? "#F9FAFB" : "#9CA3AF",
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
                  backgroundColor: "#5B8AFF",
                  flexShrink: 0,
                }} />
              )}
            </Link>
          );
        })}

        {/* ── Divider + quick links ── */}
        <div style={{ borderTop: "1px solid #1F2937", margin: "12px 4px", paddingTop: 12 }}>
          {[
            { href: "/refer", label: "Invite friends" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              style={{
                display: "block",
                fontSize: 12,
                color: "#6B7280",
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

      {/* ── Avatar footer ── */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid #1C2030", flexShrink: 0 }}>
        {/* Avatar + dropdown */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <div
            onClick={() => setDropdownOpen((o) => !o)}
            style={{
              backgroundColor: "#1F2937", borderRadius: 10, padding: "9px 12px",
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none",
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              backgroundColor: "#1A3A8F", color: "#ffffff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 800, flexShrink: 0,
            }}>
              {initials || "?"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F9FAFB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {displayName}
              </div>
              <div style={{ fontSize: 10, color: "#6B7280" }}>{firstName}</div>
            </div>
            <span style={{ fontSize: 9, color: "#6B7280", flexShrink: 0 }}>{dropdownOpen ? "▲" : "▼"}</span>
          </div>

          {dropdownOpen && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0,
              backgroundColor: "#1F2937", border: "1px solid #374151",
              borderRadius: 10, padding: 6, zIndex: 100,
              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
            }}>
              <Link href="/profile"  onClick={() => { setDropdownOpen(false); onNavigate?.(); }} className="sidebar-dropdown-item">Edit profile</Link>
              <Link href="/settings" onClick={() => { setDropdownOpen(false); onNavigate?.(); }} className="sidebar-dropdown-item">Settings</Link>
              <div style={{ height: 1, backgroundColor: "#374151", margin: "4px 0" }} />
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
