import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function WelcomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("current_role").eq("id", session.user.id).single();
  if (profile?.current_role) redirect("/dashboard");

  const FEATURES = [
    { bg: "#FDE68A", icon: "🎯", title: "Set your quest",    body: "Tell us where you want to go. We track your progress and keep you accountable." },
    { bg: "#C4B5FD", icon: "🔍", title: "Find your mentor",  body: "Browse verified experts for resume help, mock interviews, and more." },
    { bg: "#00C9A7", icon: "🤝", title: "Join your circle",  body: "Connect with people in the same role, at the same stage of their journey." },
  ];

  const STATS = [
    { num: "1,200+", label: "experts" },
    { num: "8,400+", label: "sessions" },
    { num: "92%",    label: "success rate" },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#FAF7F2", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ padding: "20px 40px" }}>
        <span style={{ fontSize: "20px", fontWeight: 800, color: "#1a1a1a" }}>
          mentor<span style={{ color: "#00C9A7" }}>.</span>
        </span>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px" }}>
        <h1 style={{ fontSize: "36px", fontWeight: 800, color: "#1a1a1a", lineHeight: 1.15, maxWidth: "520px", marginBottom: "14px" }}>
          Your career, on a mission.
        </h1>
        <p style={{ fontSize: "16px", color: "#888888", marginBottom: "32px", maxWidth: "360px" }}>
          Set goals. Find your mentor. Land the role.
        </p>
        <Link href="/profile" style={{
          display: "inline-block",
          backgroundColor: "#1B3A35", color: "#00C9A7",
          fontSize: "15px", fontWeight: 700,
          borderRadius: "8px", padding: "14px 28px",
          textDecoration: "none",
          transition: "opacity 0.15s",
        }}>
          Let&apos;s set up your profile →
        </Link>

        {/* Feature cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", width: "100%", maxWidth: "860px", marginTop: "56px" }}>
          {FEATURES.map(({ bg, icon, title, body }) => (
            <div key={title} style={{
              backgroundColor: "#ffffff",
              border: "1px solid #eeeeee",
              borderRadius: "16px",
              padding: "28px 22px",
              textAlign: "left",
            }}>
              <div style={{
                width: "44px", height: "44px", backgroundColor: bg,
                borderRadius: "12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px", marginBottom: "14px",
              }}>{icon}</div>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px" }}>{title}</p>
              <p style={{ fontSize: "13px", color: "#888888", lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "48px", marginTop: "52px" }}>
          {STATS.map(({ num, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "28px", fontWeight: 800, color: "#1a1a1a", margin: 0 }}>{num}</p>
              <p style={{ fontSize: "13px", color: "#888888", marginTop: "2px" }}>{label}</p>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "13px", color: "#888888", marginTop: "40px" }}>
          Already set up?{" "}
          <Link href="/dashboard" style={{ color: "#00C9A7", fontWeight: 600, textDecoration: "none" }}>
            Go to dashboard →
          </Link>
        </p>
      </div>
    </div>
  );
}
