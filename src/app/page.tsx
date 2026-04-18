import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

// ─── Static data ──────────────────────────────────────────────────────────────

const PROOF_AVATARS = ["#F7F4D5", "#D3968C", "#839958", "#0A3323", "#105666"];
const PROOF_INITIALS = ["R", "P", "A", "N", "S"];
const ROW_AVATAR_COLORS = ["#D3968C", "#839958", "#0A3323"];

const REFERRAL_ROWS = [
  { name: "Arjun Kapoor", role: "Chief of Staff", company: "Zepto",    circle: "Founders Office",    blurred: false },
  { name: "Priya Singh",  role: "PM",             company: "Razorpay", circle: "Product",            blurred: false },
  { name: "Nikhil Mehta", role: "Growth Lead",    company: "CRED",     circle: "Growth & Marketing", blurred: true  },
];

const COMMUNITIES = [
  { icon: "🏢", name: "Founders Office",    members: 342,  canRefer: 28  },
  { icon: "📱", name: "Product",            members: 891,  canRefer: 74  },
  { icon: "📈", name: "Growth & Marketing", members: 567,  canRefer: 41  },
  { icon: "⚙️",  name: "Engineering",        members: 1204, canRefer: 103 },
];

const HOW_IT_WORKS = [
  {
    step: "01", bg: "#F7F4D5", color: "#F9FAFB",
    title: "Prep with free AI tools",
    desc:  "Score your resume, run mock interviews, study company questions. Get application-ready without spending a rupee.",
    tag: "Free · Always",
  },
  {
    step: "02", bg: "#D3968C", color: "#ffffff",
    title: "Join your circle",
    desc:  "Find people already inside your target companies. Get warm referrals — the thing that actually gets you interviews.",
    tag: "The USP",
  },
  {
    step: "03", bg: "#0A3323", color: "#F9FAFB",
    title: "Book an expert for the final push",
    desc:  "Once you have the referral, a human expert helps you nail the interview.",
    tag: "Paid · When ready",
  },
];

const FEATURES = [
  { icon: "👥", title: "Referral communities", desc: "Gated circles with people inside your target companies who can refer you." },
  { icon: "✨", title: "AI career assistant", desc: "Get real answers on salary negotiation, offer evaluation, and interview prep." },
  { icon: "📅", title: "Expert 1:1 sessions", desc: "Mock interviews, resume reviews, and coaching from people who've been there." },
  { icon: "💼", title: "Job board", desc: "Curated roles from Mentor community members. Apply with a warm intro." },
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect("/communities");

  return (
    <div style={{ backgroundColor: "#0F1117", minHeight: "100vh" }}>

      {/* ── Nav ── */}
      <header className="landing-nav">
        <Link href="/" className="landing-logo">
          mentor<span style={{ color: "#5B8AFF" }}>.</span>
        </Link>
        <nav className="landing-nav-links">
          {[
            { href: "/auth/login", label: "Communities" },
            { href: "/auth/login", label: "Jobs"        },
            { href: "/auth/login", label: "Experts"     },
          ].map(({ href, label }) => (
            <Link key={label} href={href} style={{ fontSize: 13, fontWeight: 500, color: "#6B7280", textDecoration: "none", padding: "6px 12px", borderRadius: 8 }}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="landing-nav-actions">
          <Link href="/auth/login" className="landing-nav-signin">Sign in</Link>
          <Link href="/auth/login" className="landing-cta-primary">Get started free →</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="landing-hero">
        {/* Tag pill */}
        <div style={{
          display: "inline-block",
          backgroundColor: "rgba(26,58,143,0.12)", color: "#F9FAFB",
          fontSize: 12, fontWeight: 700, borderRadius: 99,
          padding: "6px 18px", marginBottom: 24, letterSpacing: "0.3px",
          border: "1px solid #1F2937",
        }}>
          The referral is the shortcut. We make it systematic.
        </div>

        <h1 className="landing-h1">
          Get in through the{" "}
          <span style={{ color: "#5B8AFF" }}>side door.</span>
        </h1>

        <p className="landing-hero-sub">
          Join communities of people already inside your dream companies.
          Get warm referrals. Use AI to prep. Land the role.
        </p>

        <div className="landing-hero-ctas">
          <Link href="/auth/login" className="landing-cta-primary" style={{ fontSize: 15, padding: "14px 28px" }}>
            Find your circle →
          </Link>
          <Link href="/auth/login" className="landing-cta-secondary">
            Sign in
          </Link>
        </div>

        {/* Social proof */}
        <div className="landing-proof">
          <div style={{ display: "flex", alignItems: "center" }}>
            {PROOF_AVATARS.map((bg, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: "50%",
                backgroundColor: bg, border: "2px solid #F9F7EC",
                marginLeft: i > 0 ? -8 : 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800,
                color: bg === "#F7F4D5" ? "#0A3323" : "#ffffff",
                zIndex: 5 - i, position: "relative",
              }}>
                {PROOF_INITIALS[i]}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
            <span style={{ fontWeight: 800, color: "#F9FAFB" }}>2,400+</span>{" "}
            professionals got referrals through Mentor
          </p>
        </div>
      </section>

      {/* ── Referral preview ── */}
      <section className="landing-section">
        <div style={{
          backgroundColor: "#181C24", border: "1px solid #1F2937",
          borderRadius: 20, padding: 24,
        }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", color: "#6B7280", letterSpacing: "0.5px", margin: "0 0 14px", fontWeight: 600 }}>
            People in your target companies, active this week
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {REFERRAL_ROWS.map(({ name, role, company, circle, blurred }, idx) => (
              <div key={name} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 12, backgroundColor: "#0F1117",
                ...(blurred ? { filter: "blur(4px)", pointerEvents: "none" as const, userSelect: "none" as const } : {}),
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  backgroundColor: ROW_AVATAR_COLORS[idx],
                  color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800,
                }}>
                  {initials(name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB", margin: 0 }}>{name}</p>
                  <p style={{ fontSize: 11, color: "#6B7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {role} · {company} · {circle}
                  </p>
                </div>
                <Link href="/auth/login" className="landing-refer-btn">
                  Request referral
                </Link>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 14,
            backgroundColor: "#0F1117", border: "1px dashed #e8e4ce",
            borderRadius: 10, padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
          }}>
            <p style={{ fontSize: 12, color: "#6B7280", margin: 0 }}>
              Sign up free to see all referral connections
            </p>
            <Link href="/auth/login" style={{
              fontSize: 12, fontWeight: 700,
              backgroundColor: "#5B8AFF", color: "#ffffff",
              borderRadius: 8, padding: "8px 14px", textDecoration: "none",
              whiteSpace: "nowrap",
            }}>
              Join free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{ backgroundColor: "#1A3A8F", padding: "40px 24px" }}>
        <div className="landing-stats-grid">
          {[
            { num: "2,400+", label: "Referrals given"            },
            { num: "12k+",   label: "Community members"          },
            { num: "340+",   label: "Companies represented"      },
            { num: "92%",    label: "Interview rate via referral" },
          ].map(({ num, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 30, fontWeight: 800, color: "#5B8AFF", margin: "0 0 4px", lineHeight: 1 }}>{num}</p>
              <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(247,244,213,0.45)", textTransform: "uppercase", letterSpacing: "0.7px", margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-section">
        <p className="landing-eyebrow" style={{ color: "#5B8AFF" }}>EVERYTHING YOU NEED</p>
        <h2 className="landing-h2">One platform, the full journey</h2>
        <div className="landing-features-grid">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} style={{
              backgroundColor: "#181C24", border: "1px solid #1F2937",
              borderRadius: 16, padding: "20px 18px",
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#F9FAFB", margin: "0 0 6px" }}>{title}</p>
              <p style={{ fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Communities ── */}
      <section className="landing-section">
        <p className="landing-eyebrow" style={{ color: "#5B8AFF" }}>COMMUNITIES</p>
        <h2 className="landing-h2">Find your people. Get inside.</h2>
        <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 28px" }}>
          Gated circles for people in the same role, at the same stage.
        </p>
        <div className="landing-communities-grid">
          {COMMUNITIES.map(({ icon, name, members, canRefer }) => (
            <Link key={name} href="/auth/login" style={{
              backgroundColor: "#181C24", border: "1px solid #1F2937",
              borderRadius: 14, padding: "18px 16px",
              textDecoration: "none",
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                backgroundColor: "rgba(26,58,143,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>
                {icon}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#F9FAFB", margin: "0 0 3px" }}>{name}</p>
                <p style={{ fontSize: 11, color: "#6B7280", margin: "0 0 2px" }}>{members.toLocaleString("en-IN")} members</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#5B8AFF", margin: 0 }}>{canRefer} can refer</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="landing-section">
        <p className="landing-eyebrow">HOW IT WORKS</p>
        <h2 className="landing-h2">Three steps to your next role</h2>
        <div className="landing-steps-grid">
          {HOW_IT_WORKS.map(({ step, bg, color, title, desc, tag }) => (
            <div key={step} style={{ backgroundColor: bg, borderRadius: 20, padding: "28px 24px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 10, right: 16, fontSize: 52, fontWeight: 800, color, opacity: 0.08, lineHeight: 1, userSelect: "none" }}>
                {step}
              </div>
              <span style={{
                display: "inline-block",
                fontSize: 10, fontWeight: 800,
                backgroundColor: "rgba(0,0,0,0.08)", color,
                borderRadius: 99, padding: "4px 12px", marginBottom: 16,
              }}>
                {tag}
              </span>
              <p style={{ fontSize: 15, fontWeight: 800, color, margin: "0 0 8px" }}>{title}</p>
              <p style={{ fontSize: 12, color, opacity: 0.75, margin: 0, lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section className="landing-section">
        <div className="landing-testimonial">
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#F9FAFB", lineHeight: 1.7, margin: "0 0 16px" }}>
              &ldquo;I applied cold to Zepto 3 times. No response. Joined the Founders Office circle, connected with someone inside, got a referral.{" "}
              <span style={{ color: "#5B8AFF" }}>Interview in 4 days.</span>&rdquo;
            </p>
            <p style={{ fontSize: 12, color: "rgba(247,244,213,0.45)", margin: 0 }}>
              — Rohan Verma, Chief of Staff at Zepto
            </p>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ backgroundColor: "rgba(26,58,143,0.12)", borderRadius: 14, padding: "20px 28px" }}>
              <p style={{ fontSize: 36, fontWeight: 800, color: "#F9FAFB", margin: "0 0 4px", lineHeight: 1 }}>4 days</p>
              <p style={{ fontSize: 11, color: "rgba(10,51,35,0.55)", margin: 0 }}>cold apply → interview</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="landing-final-cta">
        <h2 className="landing-h2" style={{ margin: "0 0 12px" }}>The side door is open.</h2>
        <p style={{ fontSize: 15, color: "#6B7280", margin: "0 0 28px" }}>
          Find your circle. Get the referral. Land the role.
        </p>
        <Link href="/auth/login" className="landing-cta-primary" style={{ fontSize: 15, padding: "14px 32px" }}>
          Get started free →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <Link href="/" className="landing-logo" style={{ color: "#F9FAFB" }}>
          mentor<span style={{ color: "#5B8AFF" }}>.</span>
        </Link>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {["About", "Privacy", "Terms"].map((label) => (
            <Link key={label} href="#" style={{ fontSize: 12, color: "rgba(247,244,213,0.5)", textDecoration: "none" }}>
              {label}
            </Link>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "rgba(247,244,213,0.35)", margin: 0 }}>© 2025 Mentor · Built for India</p>
      </footer>

    </div>
  );
}
