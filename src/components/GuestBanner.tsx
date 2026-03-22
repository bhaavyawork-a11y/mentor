"use client";

import Link from "next/link";
import { useSession } from "@/hooks/useSession";

export default function GuestBanner() {
  const { session, loading } = useSession();
  if (loading || session) return null;
  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #FDE68A",
      borderRadius: 12,
      padding: "14px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      marginBottom: 20,
    }}>
      <p style={{ fontSize: 13, color: "#1a1a1a", margin: 0 }}>
        You&apos;re using Mentor as a guest. Sign up free to save your progress.
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
        <Link
          href="/auth/login"
          style={{ fontSize: 12, fontWeight: 800, backgroundColor: "#1B3A35", color: "#00C9A7", borderRadius: 8, padding: "8px 16px", textDecoration: "none", whiteSpace: "nowrap" }}
        >
          Sign up free →
        </Link>
        <Link
          href="/auth/login"
          style={{ fontSize: 12, fontWeight: 600, color: "#888", textDecoration: "none", whiteSpace: "nowrap" }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
