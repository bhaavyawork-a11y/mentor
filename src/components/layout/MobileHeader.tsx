"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProfile } from "@/hooks/useProfile";

export default function MobileHeader() {
  const { profile } = useProfile();
  const router = useRouter();

  const displayName = profile?.full_name ?? "";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      style={{
        backgroundColor: "#181C24",
        borderBottom: "1px solid #1F2937",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        height: 52,
        position: "sticky",
        top: 0,
        zIndex: 500,
      }}
    >
      {/* Logo */}
      <Link
        href="/communities"
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: "#F9FAFB",
          textDecoration: "none",
          letterSpacing: "-0.5px",
        }}
      >
        mentor<span style={{ color: "#B45309" }}>.</span>
      </Link>

      {/* Profile avatar */}
      <button
        onClick={() => router.push("/profile")}
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          backgroundColor: "#B45309",
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 800,
          flexShrink: 0,
        }}
        aria-label="Go to profile"
      >
        {initials || "?"}
      </button>
    </header>
  );
}
