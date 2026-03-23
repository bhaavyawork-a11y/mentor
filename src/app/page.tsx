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
  { icon: "⚙️", name: "Engineering",        members: 1204, canRefer: 103 },
];

const HOW_IT_WORKS = [
  {
    step: "01", bg: "#F7F4D5", color: "#1a1a1a",
    title: "Prep with free AI tools",
    desc:  "Score your resume, run mock interviews, study company questions. Get application-ready without spending a rupee.",
    tag: "Free · Always", tagBg: "rgba(0,0,0,0.1)", tagColor: "#1a1a1a",
  },
  {
    step: "02", bg: "#D3968C", color: "#ffffff",
    title: "Join your circle",
    desc:  "Find people already inside your target companies. Get warm referrals — the thing that actually gets you interviews.",
    tag: "The USP", tagBg: "rgba(255,255,255,0.2)", tagColor: "#ffffff",
  },
  {
    step: "03", bg: "#0A3323", color: "#F7F4D5",
    title: "Book an expert for the final push",
    desc:  "Once you have the referral, a human expert helps you nail the interview.",
    tag: "Paid · When ready", tagBg: "rgba(247,244,213,0.1)", tagColor: "#F7F4D5",
  },
];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect("/dashboard");

  return (
    <div style={{ backgroundColor: "#F9F7EC", minHeight: "100vh" }}>

      {/* ── Nav ── */}
      <header style={{
        backgroundColor: "#ffffff", borderBottom: "1px solid #e8e4ce",
        height: 56, display: "flex", alignItems: "center",
        padding: "0 48px", position: "sticky", top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ fontSize: 18, fontWeight: 800, color: "#0A3323", textDecoration: "none", marginRight: "auto" }}>
          mentor<span style={{ color: "#D3968C" }}>.</span>
        </Link>
        <nav style={{ display: "flex", gap: 2, marginRight: 24 }}>
          {[
            { href: "/communities",    label: "Communities"    },
            { href: "/resume",         label: "Resume"         },
            { href: "/mock-interview", label: "Interview Prep" },
            { href: "/experts",        label: "Experts"        },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{ fontSize: 13, fontWeight: 500, color: "#839958", textDecoration: "none", padding: "6px 12px", borderRadius: 8 }}>
              {label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/auth/login" style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", textDecoration: "none", border: "1.5px solid #e8e4ce", borderRadius: 8, padding: "7px 16px" }}>
            Sign in
          </Link>
          <Link href="/auth/login" style={{ fontSize: 13, fontWeight: 700, color: "#F7F4D5", textDecoration: "none", backgroundColor: "#0A3323", borderRadius: 8, padding: "7px 16px" }}>
            Get started free →
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 48px 56px", textAlign: "center" }}>
        {/* Tag pill */}
        <div style={{
          display: "inline-block",
          backgroundColor: "#F7F4D5", color: "#0A3323",
          fontSize: 12, fontWeight: 700, borderRadius: 99,
          padding: "6px 18px", marginBottom: 28, letterSpacing: "0.3px",
          border: "1px solid #e8e4ce",
        }}>
          The referral is the shortcut. We make it systematic.
        </div>

        <h1 style={{ fontSize: 56, fontWeight: 800, color: "#0A3323", letterSpacing: "-2px", lineHeight: 1.1, margin: "0 0 24px" }}>
          Get in through the{" "}
          <span style={{ color: "#D3968C" }}>side door.</span>
        </h1>

        <p style={{ fontSize: 16, color: "#839958", lineHeight: 1.75, maxWidth: 520, margin: "0 auto 36px" }}>
          Join communities of people already inside your dream companies.
          Get warm referrals. Use AI to prep. Land the role.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center", marginBottom: 28 }}>
          <Link href="/auth/login" style={{ fontSize: 15, fontWeight: 800, backgroundColor: "#0A3323", color: "#F7F4D5", borderRadius: 10, padding: "14px 28px", textDecoration: "none" }}>
            Find your circle →
          </Link>
          <Link href="/communities" style={{ fontSize: 15, fontWeight: 700, backgroundColor: "#F7F4D5", color: "#0A3323", border: "1px solid #e8e4ce", borderRadius: 10, padding: "14px 28px", textDecoration: "none" }}>
            Browse communities
          </Link>
        </div>

        {/* Social proof strip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {PROOF_AVATARS.map((bg, i) => (
              <div key={i} style={{
                width: 30, height: 30, borderRadius: "50%",
                backgroundColor: bg, border: "2px solid #F9F7EC",
                marginLeft: i > 0 ? -10 : 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 800,
                color: bg === "#F7F4D5" ? "#0A3323" : "#ffffff",
                zIndex: 5 - i, position: "relative",
              }}>
                {PROOF_INITIALS[i]}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>
            <span style={{ fontWeight: 800, color: "#0A3323" }}>2,400+</span>{" "}
            professionals got referrals through Mentor communities
          </p>
        </div>
      </section>

      {/* ── Referral preview card ── */}
      <section style={{ maxWidth: 780, margin: "0 auto", padding: "0 48px 56px" }}>
        <div style={{
          backgroundColor: "#ffffff", border: "1px solid #e8e4ce",
          borderRadius: 20, padding: 28,
        }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", color: "#839958", letterSpacing: "0.5px", margin: "0 0 16px", fontWeight: 600 }}>
            PEOPLE IN YOUR TARGET COMPANIES, ACTIVE THIS WEEK
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {REFERRAL_ROWS.map(({ name, role, company, circle, blurred }, idx) => (
              <div
                key={name}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 12, backgroundColor: "#F9F7EC",
                  ...(blurred ? { filter: "blur(4px)", pointerEvents: "none" as const, userSelect: "none" as const } : {}),
                }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                  backgroundColor: ROW_AVATAR_COLORS[idx],
                  color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800,
                }}>
                  {initials(name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0A3323", margin: 0 }}>{name}</p>
                  <p style={{ fontSize: 11, color: "#839958", margin: 0 }}>{role} · {company} · {circle} community</p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  backgroundColor: "#F7F4D5", color: "#0A3323",
                  border: "1px solid #e8e4ce", borderRadius: 99, padding: "3px 10px",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  Can refer at {company}
                </span>
                <Link href="/auth/login" style={{
                  fontSize: 12, fontWeight: 700,
                  backgroundColor: "#0A3323", color: "#F7F4D5",
                  borderRadius: 8, padding: "7px 14px", textDecoration: "none",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  Request referral
                </Link>
              </div>
            ))}
          </div>

          {/* Unlock bar */}
          <div style={{
            marginTop: 16,
            backgroundColor: "#F9F7EC", border: "1px dashed #e8e4ce",
            borderRadius: 10, padding: "12px 16px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>
              Sign up free to see all referral connections in your target companies
            </p>
            <Link href="/auth/login" style={{
              fontSize: 12, fontWeight: 700,
              backgroundColor: "#D3968C", color: "#ffffff",
              borderRadius: 8, padding: "8px 16px", textDecoration: "none",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              Join free →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section style={{ backgroundColor: "#0A3323", padding: "40px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {[
            { num: "2,400+", label: "Referrals given"            },
            { num: "12k+",   label: "Community members"          },
            { num: "340+",   label: "Companies represented"      },
            { num: "92%",    label: "Interview rate via referral" },
          ].map(({ num, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 34, fontWeight: 800, color: "#D3968C", margin: "0 0 6px", lineHeight: 1 }}>{num}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(247,244,213,0.4)", textTransform: "uppercase", letterSpacing: "0.8px", margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Communities section ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 48px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#D3968C", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
          COMMUNITIES
        </p>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#0A3323", letterSpacing: "-1px", margin: "0 0 10px" }}>
          Find your people. Get inside.
        </h2>
        <p style={{ fontSize: 16, color: "#839958", margin: "0 0 40px" }}>
          Gated circles for people in the same role, at the same stage.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {COMMUNITIES.map(({ icon, name, members, canRefer }) => (
            <Link
              key={name}
              href="/auth/login"
              style={{
                backgroundColor: "#ffffff", border: "1px solid #e8e4ce",
                borderRadius: 14, padding: "20px 18px",
                textDecoration: "none",
                display: "flex", flexDirection: "column", gap: 12,
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                backgroundColor: "#F7F4D5",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26,
              }}>
                {icon}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0A3323", margin: "0 0 4px" }}>{name}</p>
                <p style={{ fontSize: 11, color: "#839958", margin: "0 0 4px" }}>{members.toLocaleString("en-IN")} members</p>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#D3968C", margin: 0 }}>{canRefer} can refer</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 48px 72px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#b0ab8c", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
          HOW IT WORKS
        </p>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0A3323", letterSpacing: "-1px", margin: "0 0 36px" }}>
          Three steps to your next role
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {HOW_IT_WORKS.map(({ step, bg, color, title, desc, tag, tagBg, tagColor }) => (
            <div key={step} style={{ backgroundColor: bg, borderRadius: 20, padding: "32px 28px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 12, right: 20, fontSize: 56, fontWeight: 800, color, opacity: 0.08, lineHeight: 1, userSelect: "none" }}>
                {step}
              </div>
              <span style={{
                display: "inline-block",
                fontSize: 10, fontWeight: 800,
                backgroundColor: tagBg, color: tagColor,
                borderRadius: 99, padding: "4px 12px", marginBottom: 20,
              }}>
                {tag}
              </span>
              <p style={{ fontSize: 16, fontWeight: 800, color, margin: "0 0 10px" }}>{title}</p>
              <p style={{ fontSize: 13, color, opacity: 0.7, margin: 0, lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 48px 72px" }}>
        <div style={{
          backgroundColor: "#0A3323", borderRadius: 20, padding: "40px 48px",
          display: "flex", alignItems: "center", gap: 48,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 20, fontWeight: 700, color: "#F7F4D5", lineHeight: 1.7, margin: "0 0 20px" }}>
              &ldquo;I applied cold to Zepto 3 times. No response. Joined the Founders Office circle, connected with someone inside, got a referral.{" "}
              <span style={{ color: "#D3968C" }}>Interview in 4 days.</span>&rdquo;
            </p>
            <p style={{ fontSize: 13, color: "rgba(247,244,213,0.45)", margin: 0 }}>
              — Rohan Verma, Chief of Staff at Zepto
            </p>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ backgroundColor: "#F7F4D5", borderRadius: 16, padding: "24px 32px" }}>
              <p style={{ fontSize: 40, fontWeight: 800, color: "#0A3323", margin: "0 0 4px", lineHeight: 1 }}>4 days</p>
              <p style={{ fontSize: 11, color: "rgba(10,51,35,0.55)", margin: 0 }}>cold apply → interview</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ backgroundColor: "#ffffff", padding: "80px 48px", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#0A3323", letterSpacing: "-1px", margin: "0 0 14px" }}>
          The side door is open.
        </h2>
        <p style={{ fontSize: 16, color: "#839958", margin: "0 0 36px" }}>
          Find your circle. Get the referral. Land the role.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/auth/login" style={{ fontSize: 15, fontWeight: 800, backgroundColor: "#0A3323", color: "#F7F4D5", borderRadius: 10, padding: "14px 28px", textDecoration: "none" }}>
            Find your circle →
          </Link>
          <Link href="/communities" style={{ fontSize: 15, fontWeight: 700, backgroundColor: "#F7F4D5", color: "#0A3323", border: "1px solid #e8e4ce", borderRadius: 10, padding: "14px 28px", textDecoration: "none" }}>
            See all communities
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: "#0A3323", padding: "32px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 800, color: "#F7F4D5", textDecoration: "none" }}>
            mentor<span style={{ color: "#D3968C" }}>.</span>
          </Link>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {["Communities", "About", "Privacy", "Terms", "Blog"].map((label) => (
              <Link key={label} href={label === "Communities" ? "/communities" : "#"} style={{ fontSize: 13, color: "rgba(247,244,213,0.6)", textDecoration: "none" }}>
                {label}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "rgba(247,244,213,0.4)", margin: 0 }}>© 2025 Mentor · Built for India</p>
        </div>
      </footer>

    </div>
  );
}
