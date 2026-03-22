import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

/* ─── Types ──────────────────────────────────────── */
interface DisplayExpert {
  id: string;
  full_name: string;
  headline: string;
  expertise_areas: string[];
  minPrice: number;
}

/* ─── Fallback experts ───────────────────────────── */
const SEED_EXPERTS: DisplayExpert[] = [
  { id: "s1", full_name: "Rohan Mehta",   headline: "Product Manager · Razorpay",       expertise_areas: ["Product", "Fintech"],      minPrice: 999  },
  { id: "s2", full_name: "Priya Kapoor",  headline: "Engineering Manager · CRED",       expertise_areas: ["Engineering", "Leadership"], minPrice: 1499 },
  { id: "s3", full_name: "Arjun Nair",    headline: "Strategy Lead · Zepto",            expertise_areas: ["Strategy", "Operations"],  minPrice: 799  },
  { id: "s4", full_name: "Sanya Gupta",   headline: "Growth PM · PhonePe",              expertise_areas: ["Growth", "Marketing"],     minPrice: 1199 },
];

const AVATAR_FILLS = ["#FDE68A", "#C4B5FD", "#00C9A7", "#FFB5C8"];

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

/* ─── Page ───────────────────────────────────────── */
export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) redirect("/dashboard");

  /* Fetch top experts — fallback to seed if RLS blocks or table is empty */
  type ExpertRow = {
    id: string;
    full_name: string;
    headline: string | null;
    expertise_areas: string[];
    services: { price_cents: number }[] | null;
  };

  const { data: rawExperts } = await supabase
    .from("experts")
    .select("id, full_name, headline, expertise_areas, services(price_cents)")
    .eq("is_active", true)
    .order("rating", { ascending: false })
    .limit(4);

  const fromDB = (rawExperts ?? []) as ExpertRow[];
  const experts: DisplayExpert[] = fromDB.length >= 2
    ? fromDB.map((e) => ({
        id: e.id,
        full_name: e.full_name,
        headline: e.headline ?? "",
        expertise_areas: e.expertise_areas ?? [],
        minPrice: Math.min(...(e.services?.map((s) => Math.round(s.price_cents / 100)) ?? [999])),
      }))
    : SEED_EXPERTS;

  return (
    <div style={{ backgroundColor: "#FAF7F2", minHeight: "100vh" }}>

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <header style={{
        backgroundColor: "#ffffff", borderBottom: "1px solid #eeeeee",
        height: 56, display: "flex", alignItems: "center",
        padding: "0 48px", position: "sticky", top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a", textDecoration: "none", marginRight: "auto" }}>
          mentor<span style={{ color: "#00C9A7" }}>.</span>
        </Link>
        <nav style={{ display: "flex", gap: 2, marginRight: 24 }}>
          {[
            { href: "/resume",        label: "Resume"         },
            { href: "/mock-interview", label: "Interview Prep" },
            { href: "/jobs",          label: "Jobs"           },
            { href: "/communities",   label: "Communities"    },
            { href: "/experts",       label: "Experts"        },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{ fontSize: 13, fontWeight: 500, color: "#888888", textDecoration: "none", padding: "6px 12px", borderRadius: 8 }}>
              {label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/auth/login" style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", textDecoration: "none", border: "1.5px solid #dddddd", borderRadius: 8, padding: "7px 16px" }}>
            Sign in
          </Link>
          <Link href="/auth/login" style={{ fontSize: 13, fontWeight: 700, color: "#00C9A7", textDecoration: "none", backgroundColor: "#1B3A35", borderRadius: 8, padding: "7px 16px" }}>
            Get started free →
          </Link>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 48px 72px", textAlign: "center" }}>
        <div style={{ display: "inline-block", backgroundColor: "#1B3A35", color: "#00C9A7", fontSize: 12, fontWeight: 700, borderRadius: 99, padding: "6px 18px", marginBottom: 28, letterSpacing: "0.3px" }}>
          Career OS for India · Free to start
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-2px", lineHeight: 1.1, margin: "0 0 24px" }}>
          Play the game of{" "}
          <span style={{ color: "#00C9A7" }}>growth.</span>
        </h1>
        <p style={{ fontSize: 17, color: "#888888", lineHeight: 1.75, maxWidth: 520, margin: "0 auto 36px" }}>
          AI tools for your resume, interview prep, and job search — free.{" "}
          Connect with verified experts when you&apos;re ready to go deeper.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
          <Link href="/auth/login" style={{ fontSize: 15, fontWeight: 800, backgroundColor: "#1B3A35", color: "#00C9A7", borderRadius: 10, padding: "14px 28px", textDecoration: "none" }}>
            Start for free →
          </Link>
          <Link href="/experts" style={{ fontSize: 15, fontWeight: 700, backgroundColor: "#FDE68A", color: "#1a1a1a", borderRadius: 10, padding: "14px 28px", textDecoration: "none" }}>
            Browse experts
          </Link>
        </div>
        <p style={{ fontSize: 12, color: "#aaaaaa", marginTop: 14 }}>No credit card needed</p>
      </section>

      {/* ── Try before you sign up ─────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 48px 72px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#aaaaaa", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 20 }}>
          TRY BEFORE YOU SIGN UP
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          {/* Card 1 — Resume score */}
          <div style={{ flex: "0 0 220px", backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, backgroundColor: "#FDE68A", color: "#1a1a1a", borderRadius: 99, padding: "3px 10px", alignSelf: "flex-start" }}>FREE</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>Resume score</p>
              <p style={{ fontSize: 12, color: "#888", margin: 0, lineHeight: 1.55 }}>Upload your resume — see your ATS score instantly</p>
            </div>
            <Link href="/resume" style={{ fontSize: 12, fontWeight: 700, color: "#00C9A7", textDecoration: "none", marginTop: "auto" }}>Try now →</Link>
          </div>

          {/* Card 2 — Interview question */}
          <div style={{ flex: "0 0 220px", backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, backgroundColor: "#C4B5FD", color: "#5b3fa8", borderRadius: 99, padding: "3px 10px", alignSelf: "flex-start" }}>FREE</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>Interview question</p>
              <p style={{ fontSize: 12, color: "#888", margin: 0, lineHeight: 1.55 }}>PM · Swiggy · &quot;Why do you want to join?&quot;</p>
            </div>
            <p style={{ fontSize: 12, color: "#1a1a1a", filter: "blur(4px)", userSelect: "none", margin: 0, pointerEvents: "none" }}>Answer + model response →</p>
            <Link href="/questions" style={{ fontSize: 12, fontWeight: 700, color: "#00C9A7", textDecoration: "none", marginTop: "auto" }}>Practice free →</Link>
          </div>

          {/* Card 3 — Salary check */}
          <div style={{ flex: "0 0 220px", backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, backgroundColor: "#00C9A7", color: "#1B3A35", borderRadius: 99, padding: "3px 10px", alignSelf: "flex-start" }}>FREE</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>Salary check</p>
              <p style={{ fontSize: 12, color: "#888", margin: 0, lineHeight: 1.55 }}>PM at Series B · Bangalore</p>
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#1a1a1a", filter: "blur(5px)", userSelect: "none", margin: 0, pointerEvents: "none" }}>₹18L – ₹28L</p>
            <Link href="/salaries" style={{ fontSize: 12, fontWeight: 700, color: "#00C9A7", textDecoration: "none", marginTop: "auto" }}>Check yours →</Link>
          </div>

          {/* Card 4 — Expert mock interview */}
          <div style={{ flex: "0 0 220px", backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 10, fontWeight: 800, backgroundColor: "#1B3A35", color: "#00C9A7", borderRadius: 99, padding: "3px 10px", alignSelf: "flex-start" }}>EXPERT</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: "0 0 4px" }}>Mock interview</p>
              <p style={{ fontSize: 12, color: "#888", margin: 0, lineHeight: 1.55 }}>Rohan Mehta · PM · Razorpay</p>
            </div>
            <p style={{ fontSize: 12, color: "#555", margin: 0 }}>47 sessions · ₹999 / session</p>
            <Link href="/experts" style={{ fontSize: 12, fontWeight: 700, color: "#00C9A7", textDecoration: "none", marginTop: "auto" }}>Book session →</Link>
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "#1B3A35", padding: "40px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {[
            { num: "1,200+", label: "Verified experts"   },
            { num: "8,400+", label: "Sessions done"      },
            { num: "92%",    label: "Success rate"       },
            { num: "12k+",   label: "Community members"  },
          ].map(({ num, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 34, fontWeight: 800, color: "#FDE68A", margin: "0 0 6px", lineHeight: 1 }}>{num}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.8px", margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Free AI tools ──────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 48px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#aaaaaa", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>FREE AI TOOLS</p>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-1px", margin: "0 0 10px" }}>Everything free. Experts when you need them.</h2>
        <p style={{ fontSize: 16, color: "#888", margin: "0 0 48px" }}>Start with AI. Upgrade to a human when you want real feedback.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            {
              emoji: "📝", title: "Resume Builder & Analyser",
              bg: "#FDE68A", color: "#1a1a1a", descColor: "rgba(0,0,0,0.55)",
              desc: "Upload resume, get ATS score, line-by-line rewrites, generate new resume",
              badge: { label: "Free", bg: "rgba(0,0,0,0.1)", color: "#1a1a1a" },
              href: "/resume",
            },
            {
              emoji: "🎙️", title: "AI Mock Interview",
              bg: "#C4B5FD", color: "#1a1a1a", descColor: "rgba(0,0,0,0.55)",
              desc: "Pick role + company. Answer 5 questions. Get scored with feedback on every answer.",
              badge: { label: "Free", bg: "rgba(0,0,0,0.1)", color: "#1a1a1a" },
              href: "/mock-interview",
            },
            {
              emoji: "❓", title: "Interview Question Bank",
              bg: "#1B3A35", color: "#ffffff", descColor: "rgba(255,255,255,0.55)",
              desc: "500+ questions by role and company. Practice with AI, get model answers.",
              badge: { label: "Free", bg: "rgba(0,201,167,0.2)", color: "#00C9A7" },
              href: "/questions",
            },
            {
              emoji: "💰", title: "Salary Intelligence",
              bg: "#ffffff", color: "#1a1a1a", descColor: "#888", border: "1px solid #eee",
              desc: "See what your role pays. Contribute your data to unlock full breakdown.",
              badge: { label: "Free", bg: "#f0f0f0", color: "#888" },
              href: "/salaries",
            },
            {
              emoji: "📌", title: "Job Tracker",
              bg: "#ffffff", color: "#1a1a1a", descColor: "#888", border: "1px solid #eee",
              desc: "Track applications. Get follow-up nudges. Never lose track.",
              badge: { label: "Free", bg: "#f0f0f0", color: "#888" },
              href: "/tracker",
            },
            {
              emoji: "🧑‍💼", title: "1:1 Expert Sessions",
              bg: "#ffffff", color: "#1a1a1a", descColor: "#888", border: "1px solid #eee",
              desc: "Resume review, mock interviews, career strategy with humans who've done it.",
              badge: { label: "Expert", bg: "#1B3A35", color: "#00C9A7" },
              href: "/experts",
            },
          ].map(({ emoji, title, bg, color, descColor, desc, badge, href, border }) => (
            <Link
              key={title}
              href={href}
              style={{
                backgroundColor: bg,
                border: border ?? "none",
                borderRadius: 16,
                padding: "24px 22px",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 32 }}>{emoji}</span>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color, margin: 0, lineHeight: 1.3 }}>{title}</p>
                <span style={{ fontSize: 10, fontWeight: 800, backgroundColor: badge.bg, color: badge.color, borderRadius: 99, padding: "3px 10px", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {badge.label}
                </span>
              </div>
              <p style={{ fontSize: 12, color: descColor, margin: 0, lineHeight: 1.65 }}>{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Expert marketplace preview ──────────────────────────────────── */}
      <section style={{ backgroundColor: "#fff", padding: "72px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#aaaaaa", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 10 }}>EXPERT MARKETPLACE</p>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-1px", margin: "0 0 8px" }}>People who&apos;ve been where you want to go</h2>
              <p style={{ fontSize: 15, color: "#888", margin: 0 }}>Every expert is verified. Every session is outcome-tracked.</p>
            </div>
            <Link href="/experts" style={{ fontSize: 13, fontWeight: 700, color: "#00C9A7", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
              View all experts →
            </Link>
          </div>

          <div style={{ display: "flex", gap: 16 }}>
            {experts.map((e, i) => {
              const fill = AVATAR_FILLS[i % AVATAR_FILLS.length];
              return (
                <div key={e.id} style={{ flex: "0 0 220px", backgroundColor: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: fill, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>
                    {initials(e.full_name)}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: "0 0 3px" }}>{e.full_name}</p>
                    <p style={{ fontSize: 12, color: "#888", margin: 0 }}>{e.headline}</p>
                  </div>
                  {(e.expertise_areas ?? []).length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {e.expertise_areas.slice(0, 2).map((tag) => (
                        <span key={tag} style={{ fontSize: 10, fontWeight: 600, backgroundColor: "#f0f0f0", color: "#555", borderRadius: 99, padding: "3px 8px" }}>{tag}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
                    <span style={{ fontSize: 12, color: "#888" }}>from ₹{e.minPrice.toLocaleString("en-IN")}</span>
                    <Link href="/experts" style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#1B3A35", color: "#00C9A7", borderRadius: 8, padding: "6px 12px", textDecoration: "none" }}>
                      Book session
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 48px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#aaaaaa", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>HOW IT WORKS</p>
        <h2 style={{ fontSize: 32, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-1px", margin: "0 0 48px" }}>Three steps to your next role</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { num: "01", bg: "#FDE68A", color: "#1a1a1a", emoji: "🎯", title: "Set your goal",            desc: "Tell us your target role. We run a gap analysis and build your roadmap." },
            { num: "02", bg: "#C4B5FD", color: "#1a1a1a", emoji: "🤖", title: "Use AI to get ready",      desc: "Resume builder, mock interviews, question bank — all free tools to sharpen your edge." },
            { num: "03", bg: "#00C9A7", color: "#1B3A35", emoji: "🧑‍💼", title: "Book an expert when ready", desc: "Human layer for what AI can't do — real feedback, real accountability, real results." },
          ].map(({ num, bg, color, emoji, title, desc }) => (
            <div key={num} style={{ backgroundColor: bg, borderRadius: 20, padding: "32px 28px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 12, right: 20, fontSize: 56, fontWeight: 800, color, opacity: 0.1, lineHeight: 1, userSelect: "none" }}>{num}</div>
              <div style={{ fontSize: 36, marginBottom: 20 }}>{emoji}</div>
              <p style={{ fontSize: 16, fontWeight: 800, color, margin: "0 0 10px" }}>{title}</p>
              <p style={{ fontSize: 13, color, opacity: 0.7, margin: 0, lineHeight: 1.65 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonial ────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 48px 72px" }}>
        <div style={{ backgroundColor: "#1B3A35", borderRadius: 20, padding: "40px 48px", display: "flex", alignItems: "center", gap: 48 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", lineHeight: 1.65, margin: "0 0 20px" }}>
              &ldquo;I used the free resume tool first. Fixed 3 critical issues I didn&apos;t know I had. Then booked a mock interview. Got my{" "}
              <span style={{ color: "#FDE68A" }}>PM offer at Zepto</span>
              {" "}6 weeks later.&rdquo;
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>Aditya Sharma, PM at Zepto · was a Business Analyst</p>
          </div>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ backgroundColor: "#FDE68A", borderRadius: 16, padding: "24px 32px" }}>
              <p style={{ fontSize: 36, fontWeight: 800, color: "#1B3A35", margin: "0 0 2px", lineHeight: 1 }}>+4,500</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: "#1B3A35", margin: "0 0 4px" }}>XP</p>
              <p style={{ fontSize: 11, color: "rgba(27,58,53,0.55)", margin: 0 }}>earned on Mentor</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "#fff", padding: "80px 48px", textAlign: "center" }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-1px", margin: "0 0 14px" }}>Start free. Go further with an expert.</h2>
        <p style={{ fontSize: 16, color: "#888", margin: "0 0 36px" }}>No credit card. No commitment. Just your next career move.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/auth/login" style={{ fontSize: 15, fontWeight: 800, backgroundColor: "#1B3A35", color: "#00C9A7", borderRadius: 10, padding: "14px 28px", textDecoration: "none" }}>
            Get started free →
          </Link>
          <Link href="/experts" style={{ fontSize: 15, fontWeight: 700, backgroundColor: "#FDE68A", color: "#1a1a1a", borderRadius: 10, padding: "14px 28px", textDecoration: "none" }}>
            Browse experts
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: "#1B3A35", padding: "32px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 800, color: "#fff", textDecoration: "none" }}>
            mentor<span style={{ color: "#00C9A7" }}>.</span>
          </Link>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {["About", "Privacy", "Terms", "Blog", "For Experts"].map((label) => (
              <Link key={label} href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>{label}</Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 }}>© 2025 Mentor · Built for India</p>
        </div>
      </footer>
    </div>
  );
}
