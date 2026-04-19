"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  matchPrefixes?: string[];
  icon: (active: boolean) => React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Groups",
    href: "/communities",
    matchPrefixes: ["/communities"],
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    label: "Messages",
    href: "/messages",
    matchPrefixes: ["/messages"],
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    matchPrefixes: ["/profile", "/settings"],
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Spacer so page content doesn't hide behind nav */}
      <div className="bottom-nav-spacer" />

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTop: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "stretch",
          zIndex: 900,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = item.matchPrefixes
            ? item.matchPrefixes.some(
                (p) => pathname === p || pathname.startsWith(p + "/")
              )
            : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                paddingTop: 10,
                paddingBottom: 10,
                color: active ? "#111827" : "#9CA3AF",
                textDecoration: "none",
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.02em",
                transition: "color 0.15s",
                minHeight: 60,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {item.icon(active)}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
