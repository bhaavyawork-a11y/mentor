"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile",   label: "Profile"   },
  { href: "/goals",     label: "Goals"     },
  { href: "/experts",   label: "Experts"   },
  { href: "/bookings",  label: "Bookings"  },
];

export default function Sidebar() {
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
  const initials    = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      className="w-60 shrink-0 h-screen sticky top-0 flex flex-col px-4 py-6"
      style={{ background: "#0f0f0f" }}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="px-3 mb-10 block"
        style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff" }}
      >
        mentor<span style={{ color: "#EDE986" }}>.</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center px-3 py-2.5 rounded-[10px] transition-all duration-150",
                "text-[13px] font-medium"
              )}
              style={
                active
                  ? { background: "#F2619C", color: "#ffffff" }
                  : { color: "#666666" }
              }
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = "#cccccc";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLElement).style.color = "#666666";
              }}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="mt-4 pt-4" style={{ borderTop: "1px solid #1f1f1f" }}>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
            style={{ background: "#EDE986", color: "#0f0f0f" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate" style={{ color: "#ffffff" }}>
              {displayName}
            </p>
            <p className="text-[11px] truncate" style={{ color: "#666666" }}>
              {email}
            </p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-150 mt-1"
          style={{ color: "#666666" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#cccccc")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#666666")}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
