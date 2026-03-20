"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Target,
  Users,
  LogOut,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/profile",   icon: User,            label: "Profile"   },
  { href: "/goals",     icon: Target,          label: "Goals"     },
  { href: "/experts",   icon: Users,           label: "Experts"   },
  { href: "/bookings",  icon: Calendar,        label: "Bookings"  },
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

  const displayName = profile?.full_name ?? session?.user?.email?.split("@")[0] ?? "You";
  const initials    = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-white border-r border-cream-soft px-4 py-6">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="font-display font-semibold text-lg text-ink tracking-tight px-3 mb-8"
      >
        mentor<span className="text-sage">.</span>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-ink text-cream"
                  : "text-ink/50 hover:text-ink hover:bg-cream"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-cream-soft pt-4 mt-4 space-y-1">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cream transition-all duration-150"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sage/20 to-sage/5 border border-sage/10 flex items-center justify-center shrink-0 text-sage font-semibold text-xs">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-ink truncate">{displayName}</p>
            <p className="text-xs text-ink/30 truncate">
              {profile?.current_role ?? "Set your role →"}
            </p>
          </div>
        </Link>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink/40 hover:text-ink hover:bg-cream transition-all duration-150"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
