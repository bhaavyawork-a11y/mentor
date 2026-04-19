"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
  matchPrefixes?: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Groups",
    href: "/communities",
    matchPrefixes: ["/communities"],
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
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
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/profile",
    matchPrefixes: ["/profile", "/settings"],
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
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
      {/* Spacer so content doesn't hide behind nav */}
      <div className="bottom-nav-spacer" />

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#0C0E14",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "stretch",
          zIndex: 900,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active =
            item.matchPrefixes
              ? item.matchPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))
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
                gap: 4,
                paddingTop: 10,
                paddingBottom: 8,
                color: active ? "#5B8AFF" : "rgba(156,163,175,0.6)",
                textDecoration: "none",
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.01em",
                transition: "color 0.15s",
                minHeight: 56,
                WebkitTapHighlightColor: "transparent",
                position: "relative",
              }}
            >
              {/* Active top indicator */}
              {active && (
                <span style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 24,
                  height: 2,
                  borderRadius: "0 0 2px 2px",
                  backgroundColor: "#5B8AFF",
                }} />
              )}
              {item.icon(active)}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
