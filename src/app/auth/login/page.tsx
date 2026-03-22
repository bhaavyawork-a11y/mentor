"use client";

import { createClient } from "@/lib/supabase";
import { Linkedin, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLinkedInLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: "openid profile email" },
    });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "#FAF7F2" }}>
      {/* Left panel */}
      <div style={{
        display: "none",
        width: "50%",
        backgroundColor: "#1B3A35",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px",
      }} className="lg:flex">
        <Link href="/" style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff", textDecoration: "none" }}>
          mentor<span style={{ color: "#00C9A7" }}>.</span>
        </Link>
        <div>
          <blockquote style={{ fontSize: "20px", lineHeight: 1.6, fontWeight: 300, color: "rgba(255,255,255,0.75)", marginBottom: "24px", maxWidth: "380px" }}>
            &ldquo;I went from senior engineer to engineering director in 8 months with the clarity Mentor gave me.&rdquo;
          </blockquote>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "99px",
              backgroundColor: "#FDE68A", color: "#1a1a1a",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: 800,
            }}>AK</div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", margin: 0 }}>Ananya Kumar</p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", margin: 0 }}>Engineering Director, Stripe</p>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          {["Goal Setting", "Expert Mentors", "Career Tracking"].map((t) => (
            <div key={t} style={{
              padding: "8px 12px", borderRadius: "8px",
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.5)", fontSize: "11px", textAlign: "center",
            }}>{t}</div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}>
        <div style={{ width: "100%", maxWidth: "360px" }}>
          <Link href="/" style={{ fontSize: "20px", fontWeight: 800, color: "#1a1a1a", textDecoration: "none", display: "block", marginBottom: "48px" }} className="lg:hidden">
            mentor<span style={{ color: "#00C9A7" }}>.</span>
          </Link>

          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#1a1a1a", marginBottom: "8px" }}>Welcome back</h1>
          <p style={{ fontSize: "13px", color: "#888888", marginBottom: "28px" }}>Sign in to continue your career journey.</p>

          <button onClick={handleLinkedInLogin} disabled={loading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              backgroundColor: "#0077B5", color: "#ffffff",
              fontSize: "13px", fontWeight: 600,
              borderRadius: "8px", padding: "12px 20px",
              border: "none", cursor: "pointer", opacity: loading ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}>
            <Linkedin style={{ width: "18px", height: "18px" }} />
            {loading ? "Connecting…" : "Continue with LinkedIn"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#eeeeee" }} />
            <span style={{ fontSize: "11px", color: "#aaaaaa" }}>or</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "#eeeeee" }} />
          </div>

          <EmailForm />

          <p style={{ textAlign: "center", fontSize: "11px", color: "#aaaaaa", marginTop: "28px" }}>
            By continuing, you agree to our{" "}
            <Link href="/terms" style={{ color: "#888888", textDecoration: "underline" }}>Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" style={{ color: "#888888", textDecoration: "underline" }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (!error) setSent(true);
    setLoading(false);
  };

  if (sent) return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <p style={{ fontSize: "13px", color: "#888888" }}>
        Magic link sent to <strong style={{ color: "#1a1a1a" }}>{email}</strong>. Check your inbox.
      </p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com" required className="input" />
      <button type="submit" disabled={loading} className="btn-primary"
        style={{ justifyContent: "center", padding: "12px 20px", opacity: loading ? 0.7 : 1 }}>
        {loading ? "Sending…" : "Send magic link"}
        <ArrowRight style={{ width: "14px", height: "14px" }} />
      </button>
    </form>
  );
}
