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
    <div style={{ minHeight: "100vh", backgroundColor: "#F9F7EC", display: "flex", flexDirection: "column" }}>

      {/* ── Minimal nav ── */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 52, borderBottom: "1px solid #e8e4ce",
        backgroundColor: "#ffffff",
      }}>
        <Link href="/" style={{ fontSize: 17, fontWeight: 800, color: "#0A3323", textDecoration: "none" }}>
          mentor<span style={{ color: "#D3968C" }}>.</span>
        </Link>
        <Link href="/" style={{ fontSize: 12, color: "#839958", textDecoration: "none" }}>
          ← Back
        </Link>
      </header>

      {/* ── Sign-in card ── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "32px 16px",
      }}>
        <div style={{
          width: "100%", maxWidth: 380,
          backgroundColor: "#ffffff", border: "1px solid #e8e4ce",
          borderRadius: 20, padding: "36px 28px",
        }}>
          {/* Logo + headline */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 52, height: 52, borderRadius: 14,
              backgroundColor: "#0A3323", marginBottom: 14,
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#F7F4D5" }}>m</span>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0A3323", margin: "0 0 6px" }}>
              Get in through the side door
            </h1>
            <p style={{ fontSize: 13, color: "#839958", margin: 0 }}>
              Join thousands of professionals landing roles via referrals.
            </p>
          </div>

          {/* LinkedIn — primary */}
          <button
            onClick={handleLinkedInLogin}
            disabled={loading}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 10,
              backgroundColor: "#0077B5", color: "#ffffff",
              fontSize: 14, fontWeight: 700,
              borderRadius: 10, padding: "13px 20px",
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "opacity 0.15s",
              marginBottom: 16,
            }}>
            <Linkedin style={{ width: 18, height: 18 }} />
            {loading ? "Connecting…" : "Continue with LinkedIn"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: "#e8e4ce" }} />
            <span style={{ fontSize: 11, color: "#b0ab8c" }}>or use email</span>
            <div style={{ flex: 1, height: 1, backgroundColor: "#e8e4ce" }} />
          </div>

          {/* Email magic link */}
          <EmailForm />

          {/* Fine print */}
          <p style={{ textAlign: "center", fontSize: 11, color: "#b0ab8c", margin: "20px 0 0", lineHeight: 1.6 }}>
            By signing up you agree to our{" "}
            <Link href="/terms" style={{ color: "#839958", textDecoration: "underline" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" style={{ color: "#839958", textDecoration: "underline" }}>Privacy Policy</Link>.
          </p>
        </div>

        {/* Social proof under card */}
        <div style={{ position: "absolute", bottom: 28, left: 0, right: 0, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>
            Trusted by <span style={{ fontWeight: 700, color: "#0A3323" }}>2,400+</span> early-career professionals in India
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailForm() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (!error) setSent(true);
    setLoading(false);
  };

  if (sent) return (
    <div style={{
      textAlign: "center", padding: "16px 12px",
      backgroundColor: "#F9F7EC", borderRadius: 10,
      border: "1px solid #e8e4ce",
    }}>
      <p style={{ fontSize: 13, color: "#0A3323", fontWeight: 700, margin: "0 0 4px" }}>Check your inbox ✉️</p>
      <p style={{ fontSize: 12, color: "#839958", margin: 0 }}>
        Magic link sent to <strong style={{ color: "#1a1a1a" }}>{email}</strong>
      </p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="input"
      />
      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
        style={{ justifyContent: "center", padding: "11px 20px", opacity: loading ? 0.7 : 1 }}>
        {loading ? "Sending…" : "Send magic link"}
        <ArrowRight style={{ width: 14, height: 14 }} />
      </button>
    </form>
  );
}
