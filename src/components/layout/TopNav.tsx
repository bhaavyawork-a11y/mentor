"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import type { Profile } from "@/types";

const NAV_LINKS = [
  { href: "/dashboard", label: "Home"     },
  { href: "/goals",     label: "Quests"   },
  { href: "/experts",   label: "Mentors"  },
  { href: "/bookings",  label: "Library"  },
];

function navLevel(profile: Profile | null) {
  if (!profile) return 1;
  const fields = [
    profile.full_name, profile.bio, profile.location,
    profile.current_job_role, profile.target_role, profile.industry, profile.linkedin_url,
  ];
  const xp = fields.filter(Boolean).length * 15
           + Math.min((profile.skills ?? []).length * 5, 50);
  if (xp >= 2000) return 5;
  if (xp >= 1000) return 4;
  if (xp >= 500)  return 3;
  if (xp >= 200)  return 2;
  return 1;
}

export default function TopNav() {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();
  const { session } = useSession();
  const { profile }  = useProfile();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const email       = session?.user?.email ?? "";
  const displayName = profile?.full_name ?? email.split("@")[0] ?? "You";
  const firstName   = displayName.split(" ")[0];
  const initials    = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const level       = navLevel(profile ?? null);

  return (
    <header style={{
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #eeeeee",
      height: "56px",
      display: "flex",
      alignItems: "center",
      padding: "0 32px",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <Link href="/dashboard" style={{ fontSize: "18px", fontWeight: 800, color: "#1a1a1a", textDecoration: "none", marginRight: "40px", flexShrink: 0 }}>
        mentor<span style={{ color: "#00C9A7" }}>.</span>
      </Link>

      {/* Nav links */}
      <nav style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: "13px",
                fontWeight: active ? 700 : 500,
                color: active ? "#1a1a1a" : "#888888",
                textDecoration: "none",
                padding: "6px 12px",
                borderRadius: "8px",
                transition: "color 0.15s, background 0.15s",
                background: active ? "#FAF7F2" : "transparent",
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right: level pill + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {/* Level pill */}
        <div style={{
          backgroundColor: "#1B3A35",
          color: "#00C9A7",
          fontSize: "11px",
          fontWeight: 800,
          borderRadius: "99px",
          padding: "4px 12px",
          whiteSpace: "nowrap",
        }}>
          Level {level} · {firstName}
        </div>

        {/* Avatar */}
        <button
          onClick={handleSignOut}
          title="Sign out"
          style={{
            width: "32px", height: "32px",
            borderRadius: "99px",
            backgroundColor: "#FDE68A",
            color: "#1a1a1a",
            fontSize: "11px",
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
