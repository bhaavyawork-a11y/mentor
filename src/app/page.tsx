import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

// ─── Avatar data ───────────────────────────────────────────────────────────────
const AVATARS = [
  { initial: "R", bg: "#1A3A8F" },
  { initial: "K", bg: "#16A34A" },
  { initial: "A", bg: "#DC2626" },
  { initial: "S", bg: "#D97706" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect("/communities");

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "#050508",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-sora), Inter, sans-serif",
      }}
    >
      {/* ── Background SVG ──────────────────────────────── */}
      <svg
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="sp-dots" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.85" fill="rgba(255,255,255,0.07)" />
          </pattern>
          <radialGradient id="sp-glow1" cx="80%" cy="15%" r="55%">
            <stop offset="0%" stopColor="#5B8AFF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#5B8AFF" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="sp-glow2" cx="10%" cy="78%" r="48%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#sp-dots)" />
        <rect width="100%" height="100%" fill="url(#sp-glow1)" />
        <rect width="100%" height="100%" fill="url(#sp-glow2)" />
        {/* Concentric arcs — top right */}
        <circle cx="390" cy="0" r="220" fill="none" stroke="rgba(91,138,255,0.07)"  strokeWidth="1" />
        <circle cx="390" cy="0" r="165" fill="none" stroke="rgba(91,138,255,0.09)"  strokeWidth="1" />
        <circle cx="390" cy="0" r="110" fill="none" stroke="rgba(91,138,255,0.11)"  strokeWidth="1.5" />
        <circle cx="390" cy="0" r="65"  fill="rgba(91,138,255,0.07)" />
        {/* Concentric arcs — bottom left */}
        <circle cx="0" cy="844" r="220" fill="none" stroke="rgba(139,92,246,0.06)" strokeWidth="1" />
        <circle cx="0" cy="844" r="155" fill="none" stroke="rgba(139,92,246,0.07)" strokeWidth="1" />
        {/* Accent dots */}
        <circle cx="55"  cy="170" r="2"   fill="rgba(91,138,255,0.35)" />
        <circle cx="115" cy="105" r="1.5" fill="rgba(91,138,255,0.22)" />
        <circle cx="330" cy="290" r="2.5" fill="rgba(91,138,255,0.22)" />
        <circle cx="295" cy="230" r="1.5" fill="rgba(91,138,255,0.15)" />
        <circle cx="75"  cy="660" r="2"   fill="rgba(139,92,246,0.28)" />
        <circle cx="160" cy="730" r="1.5" fill="rgba(139,92,246,0.20)" />
        {/* Triangle accent */}
        <path d="M310 580 L370 510 L385 600 Z"
          fill="rgba(91,138,255,0.04)"
          stroke="rgba(91,138,255,0.09)"
          strokeWidth="0.5"
        />
      </svg>

      {/* ── Status bar ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 28px 0",
          fontSize: 13,
          fontWeight: 800,
          color: "rgba(255,255,255,0.5)",
          position: "relative",
          zIndex: 5,
        }}
      >
        <span>9:41</span>
        <span style={{ fontSize: 11 }}>●●● 🔋</span>
      </div>

      {/* ── Main layout ─────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "0 28px 52px",
          position: "relative",
          zIndex: 5,
        }}
      >
        {/* Logo — vertically centered in upper section */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
          }}
        >
          {/* M badge icon */}
          <svg width="76" height="76" viewBox="0 0 42 42">
            <defs>
              <linearGradient id="badge-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1A3A8F" />
                <stop offset="100%" stopColor="#3B6FFF" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width="42" height="42" rx="12" fill="url(#badge-g)" />
            <path
              d="M10 32 L10 12 L21 28 L32 12 L32 32"
              stroke="#fff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>

          {/* Wordmark */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-1.2px",
              lineHeight: 1,
            }}
          >
            mentor<span style={{ color: "#5B8AFF" }}>.</span>
          </div>
        </div>

        {/* Bottom — tagline + proof + CTAs */}
        <div>
          {/* Tagline */}
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.30)",
              textAlign: "center",
              lineHeight: 1.7,
              margin: "0 auto 28px",
              maxWidth: 280,
            }}
          >
            The only career community where everyone in the room has been verified.
          </p>

          {/* Members proof pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 999,
              padding: "9px 18px",
              width: "fit-content",
              margin: "0 auto 32px",
            }}
          >
            <div style={{ display: "flex" }}>
              {AVATARS.map((av, i) => (
                <div
                  key={i}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: "2.5px solid #050508",
                    background: av.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    color: "#fff",
                    marginLeft: i > 0 ? -7 : 0,
                    position: "relative",
                    zIndex: 10 - i,
                  }}
                >
                  {av.initial}
                </div>
              ))}
            </div>
            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.38)",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              4,300+ verified professionals
            </span>
          </div>

          {/* Primary CTA */}
          <Link
            href="/auth/login"
            style={{
              display: "block",
              width: "100%",
              padding: "17px",
              background: "#FFFFFF",
              color: "#050508",
              fontSize: 16,
              fontWeight: 900,
              borderRadius: 14,
              textDecoration: "none",
              textAlign: "center",
              letterSpacing: "-0.3px",
              marginBottom: 14,
            }}
          >
            Get early access →
          </Link>

          {/* Sign in secondary */}
          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "rgba(255,255,255,0.22)",
              fontWeight: 500,
              margin: 0,
            }}
          >
            Already a member?{" "}
            <Link
              href="/auth/login?mode=signin"
              style={{
                color: "rgba(255,255,255,0.5)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
