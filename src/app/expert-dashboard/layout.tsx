"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

const NAV = [
  { label: "Overview",    href: "/expert-dashboard",           icon: "📊", exact: true  },
  { label: "My Profile",  href: "/expert-dashboard/profile",   icon: "👤", exact: false },
  { label: "Services",    href: "/expert-dashboard/services",  icon: "🎯", exact: false },
  { label: "Bookings",    href: "/expert-dashboard/bookings",  icon: "📅", exact: false },
  { label: "Earnings",    href: "/expert-dashboard/earnings",  icon: "💰", exact: false },
];

function ExpertSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data } = await supabase
        .from("experts")
        .select("google_connected")
        .eq("user_id", session.user.id)
        .single();
      if (data) setGoogleConnected(!!data.google_connected);
    });
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div style={{
      width: 220, minHeight: "100vh", backgroundColor: "#064E3B",
      display: "flex", flexDirection: "column", flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 18px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#F9FAFB" }}>
          mentor<span style={{ color: "#B45309" }}>.</span>
          <span style={{ fontSize: 10, color: "#6B7280", fontWeight: 600, marginLeft: 8, letterSpacing: "0.4px" }}>
            Expert Portal
          </span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        {NAV.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10, marginBottom: 2,
              textDecoration: "none",
              backgroundColor: active ? "rgba(247,244,213,0.1)" : "transparent",
              color: active ? "#F7F4D5" : "rgba(247,244,213,0.5)",
              fontWeight: active ? 700 : 500, fontSize: 13,
              transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
              {active && <span style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", backgroundColor: "#839958" }} />}
            </Link>
          );
        })}

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", margin: "16px 4px" }} />

        {/* Google Meet connect */}
        <Link href="/api/expert/google/auth" style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 12px", borderRadius: 10,
          backgroundColor: googleConnected ? "rgba(131,153,88,0.15)" : "rgba(211,150,140,0.12)",
          textDecoration: "none", cursor: "pointer",
        }}>
          <span style={{ fontSize: 14 }}>📹</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: googleConnected ? "#839958" : "#D3968C" }}>
              {googleConnected ? "Google Meet ✓" : "Connect Google Meet"}
            </div>
            <div style={{ fontSize: 9, color: "rgba(247,244,213,0.35)" }}>
              {googleConnected ? "Auto-links on booking" : "Auto-generate links"}
            </div>
          </div>
        </Link>

        {/* Back to app */}
        <Link href="/experts" style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 12px", borderRadius: 10, marginTop: 6,
          textDecoration: "none", fontSize: 12,
          color: "rgba(247,244,213,0.35)",
        }}>
          ← Back to Mentor
        </Link>
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <button onClick={signOut} style={{
          width: "100%", padding: "9px 12px", borderRadius: 10,
          backgroundColor: "transparent", border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(247,244,213,0.4)", fontSize: 12, cursor: "pointer",
          textAlign: "left", fontFamily: "inherit",
        }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function ExpertDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#f9f7f2" }}>
      <ExpertSidebar />
      <div style={{ flex: 1, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}
