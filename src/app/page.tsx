import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

// ─── Proof avatars ─────────────────────────────────────────────────────────────
const PROOF = [
  { initials: "R", bg: "#D3968C" },
  { initials: "K", bg: "#5B8AFF" },
  { initials: "A", bg: "#1A3A8F" },
  { initials: "S", bg: "#105666" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect("/communities");

  return (
    <div style={{
      minHeight: "100dvh",
      backgroundColor: "#080B14",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* ── Constellation background ── */}
      <svg
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.35, pointerEvents: "none" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* faint lines */}
        <line x1="15%" y1="10%" x2="35%" y2="28%" stroke="#3B5BDB" strokeWidth="0.5" />
        <line x1="35%" y1="28%" x2="60%" y2="18%" stroke="#3B5BDB" strokeWidth="0.5" />
        <line x1="60%" y1="18%" x2="80%" y2="35%" stroke="#3B5BDB" strokeWidth="0.5" />
        <line x1="20%" y1="65%" x2="42%" y2="55%" stroke="#3B5BDB" strokeWidth="0.5" />
        <line x1="42%" y1="55%" x2="68%" y2="70%" stroke="#3B5BDB" strokeWidth="0.5" />
        <line x1="68%" y1="70%" x2="85%" y2="58%" stroke="#3B5BDB" strokeWidth="0.5" />
        <line x1="35%" y1="28%" x2="42%" y2="55%" stroke="#3B5BDB" strokeWidth="0.4" />
        <line x1="60%" y1="18%" x2="68%" y2="70%" stroke="#3B5BDB" strokeWidth="0.3" />
        {/* dots */}
        {[
          [15,10],[35,28],[60,18],[80,35],[20,65],[42,55],[68,70],[85,58],
          [8,42],[92,25],[50,85],[72,92],[25,80],[88,78],[5,70],[95,50],
          [48,12],[12,50],[75,15],[30,90],[62,42],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={`${cx}%`} cy={`${cy}%`} r={i % 3 === 0 ? 1.5 : 1} fill="#5B8AFF" />
        ))}
      </svg>

      {/* ── Content ── */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 360,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 0,
      }}>

        {/* App icon */}
        <div style={{
          width: 76, height: 76, borderRadius: 20,
          background: "linear-gradient(135deg, #1A3A8F 0%, #3B6FFF 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 22,
          boxShadow: "0 8px 32px rgba(91,138,255,0.35)",
        }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: "#fff", fontFamily: "inherit", letterSpacing: -1 }}>M</span>
        </div>

        {/* Wordmark */}
        <h1 style={{
          fontSize: 38, fontWeight: 900, color: "#F9FAFB", margin: "0 0 20px",
          letterSpacing: "-1px", lineHeight: 1,
        }}>
          mentor<span style={{ color: "#5B8AFF" }}>.</span>
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: 15, color: "#9CA3AF", lineHeight: 1.65,
          margin: "0 0 32px", maxWidth: 300,
        }}>
          The only career community where everyone in the room has been verified.
        </p>

        {/* Proof pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          backgroundColor: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 99, padding: "8px 16px",
          marginBottom: 32,
        }}>
          <div style={{ display: "flex" }}>
            {PROOF.map((p, i) => (
              <div key={p.initials} style={{
                width: 24, height: 24, borderRadius: "50%",
                backgroundColor: p.bg,
                border: "2px solid #080B14",
                marginLeft: i > 0 ? -7 : 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 8, fontWeight: 800, color: "#fff",
                zIndex: 4 - i, position: "relative",
              }}>
                {p.initials}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#D1D5DB", whiteSpace: "nowrap" }}>
            4,300+ verified professionals
          </span>
        </div>

        {/* Primary CTA */}
        <Link
          href="/auth/login"
          style={{
            display: "block", width: "100%",
            backgroundColor: "#ffffff", color: "#080B14",
            fontSize: 15, fontWeight: 800,
            padding: "15px 24px", borderRadius: 14,
            textDecoration: "none", textAlign: "center",
            letterSpacing: "-0.2px",
            marginBottom: 16,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            transition: "transform 0.15s",
          }}
        >
          Get early access →
        </Link>

        {/* Sign in link */}
        <p style={{ fontSize: 13, color: "#6B7280", margin: 0 }}>
          Already a member?{" "}
          <Link href="/auth/login" style={{ color: "#9CA3AF", fontWeight: 700, textDecoration: "none" }}>
            Sign in
          </Link>
        </p>
      </div>

      {/* Fine print */}
      <p style={{
        position: "absolute", bottom: 24,
        fontSize: 11, color: "#374151", margin: 0,
      }}>
        © 2025 Mentor · Built for India
      </p>
    </div>
  );
}
