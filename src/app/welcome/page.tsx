import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function WelcomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  // If profile is already complete, skip onboarding
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_role")
    .eq("id", session.user.id)
    .single();

  if (profile?.current_role) redirect("/dashboard");

  const FEATURES = [
    {
      bg: "#EDE986",
      icon: "🎯",
      title: "Set your goal",
      body: "Tell us where you want to go. We track your progress and keep you accountable.",
    },
    {
      bg: "#E7BEF8",
      icon: "🔍",
      title: "Find your expert",
      body: "Browse verified experts for resume help, mock interviews, and more.",
    },
    {
      bg: "#93ABD9",
      icon: "🤝",
      title: "Join your community",
      body: "Connect with people in the same role, at the same stage.",
    },
  ];

  const STATS = [
    { num: "1,200+", label: "experts" },
    { num: "8,400+", label: "sessions" },
    { num: "92%",    label: "success rate" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#fdf9f7", fontFamily: "var(--font-sora, system-ui)" }}
    >
      {/* Nav */}
      <nav className="px-10 py-6">
        <span style={{ fontSize: "20px", fontWeight: 800, color: "#0f0f0f" }}>
          mentor<span style={{ color: "#EDE986" }}>.</span>
        </span>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <h1
          style={{
            fontSize: "36px", fontWeight: 800, color: "#0f0f0f",
            lineHeight: 1.15, maxWidth: "520px", marginBottom: "16px",
          }}
        >
          Your career, on a mission.
        </h1>
        <p style={{ fontSize: "16px", color: "#888", marginBottom: "36px", maxWidth: "380px" }}>
          Set goals. Find your expert. Land the role.
        </p>
        <Link
          href="/profile"
          style={{
            background: "#F2619C", color: "#ffffff",
            fontSize: "16px", fontWeight: 700,
            borderRadius: "12px", padding: "14px 28px",
            display: "inline-block", textDecoration: "none",
          }}
          className="transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Let&apos;s set up your profile →
        </Link>

        {/* Feature cards */}
        <div
          className="grid md:grid-cols-3 gap-5 w-full mt-16"
          style={{ maxWidth: "860px" }}
        >
          {FEATURES.map(({ bg, icon, title, body }) => (
            <div
              key={title}
              style={{
                background: "#ffffff",
                border: "1.5px solid #f0f0f0",
                borderRadius: "16px",
                padding: "28px 24px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: "44px", height: "44px", background: bg,
                  borderRadius: "12px", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: "22px", marginBottom: "16px",
                }}
              >
                {icon}
              </div>
              <p style={{ fontSize: "15px", fontWeight: 800, color: "#0f0f0f", marginBottom: "8px" }}>
                {title}
              </p>
              <p style={{ fontSize: "13px", color: "#888", lineHeight: 1.6 }}>
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex gap-12 mt-14">
          {STATS.map(({ num, label }) => (
            <div key={label} className="text-center">
              <p style={{ fontSize: "28px", fontWeight: 800, color: "#0f0f0f" }}>{num}</p>
              <p style={{ fontSize: "13px", color: "#888", marginTop: "2px" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Footer link */}
        <p className="mt-12" style={{ fontSize: "13px", color: "#888" }}>
          Already set up?{" "}
          <Link href="/dashboard" style={{ color: "#F2619C", fontWeight: 600 }}>
            Go to dashboard →
          </Link>
        </p>
      </div>
    </div>
  );
}
