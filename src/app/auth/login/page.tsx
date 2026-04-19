"use client";

import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useState } from "react";

// ─── Input style ──────────────────────────────────────────────────────────────
const fieldStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "13px 14px", fontSize: 14,
  border: "1.5px solid #E5E7EB", borderRadius: 10,
  fontFamily: "inherit", outline: "none",
  backgroundColor: "#fff", color: "#111827",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700,
  color: "#374151", marginBottom: 6, textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const [mode, setMode]       = useState<"signup" | "signin">("signup");
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const supabase = createClient();

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "signup") {
      // Sign up with email + password
      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpErr) {
        setError(signUpErr.message);
      } else {
        setSent(true);
      }
    } else {
      // Sign in
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        // Fallback: magic link
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (otpErr) setError(otpErr.message);
        else setSent(true);
      }
      // On success Supabase redirects automatically
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div style={{
        minHeight: "100dvh", backgroundColor: "#F9FAFB",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "32px 16px",
      }}>
        <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>Check your inbox</h2>
          <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6, margin: 0 }}>
            We sent a confirmation link to{" "}
            <strong style={{ color: "#111827" }}>{email}</strong>.<br />
            Click it to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100dvh", backgroundColor: "#F9FAFB",
      display: "flex", flexDirection: "column",
    }}>

      {/* ── Top bar ── */}
      <div style={{ padding: "20px 24px" }}>
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: "#F3F4F6", textDecoration: "none",
          fontSize: 18, color: "#374151",
        }}>
          ←
        </Link>
      </div>

      {/* ── Form ── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "8px 24px 48px",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>

          {/* Heading */}
          <h1 style={{
            fontSize: 30, fontWeight: 900, color: "#111827",
            margin: "0 0 6px", letterSpacing: "-0.8px", lineHeight: 1.1,
          }}>
            {mode === "signup" ? "Create account." : "Welcome back."}
          </h1>
          <p style={{ fontSize: 14, color: "#9CA3AF", margin: "0 0 28px" }}>
            {mode === "signup"
              ? "Join the waitlist. We screen everyone."
              : "Sign in to your Mentor account."}
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              backgroundColor: "#fff", color: "#111827",
              fontSize: 14, fontWeight: 600,
              borderRadius: 10, padding: "13px 20px",
              border: "1.5px solid #D1D5DB",
              cursor: googleLoading ? "not-allowed" : "pointer",
              opacity: googleLoading ? 0.7 : 1,
              fontFamily: "inherit",
              marginBottom: 20,
            }}
          >
            {/* Google G icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Connecting…" : "Continue with Google"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
          </div>

          {/* Form fields */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {mode === "signup" && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Bhaavya Gupta"
                  required
                  style={fieldStyle}
                  onFocus={e => (e.target.style.borderColor = "#1A3A8F")}
                  onBlur={e => (e.target.style.borderColor = "#E5E7EB")}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Work Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={fieldStyle}
                onFocus={e => (e.target.style.borderColor = "#1A3A8F")}
                onBlur={e => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                minLength={8}
                style={fieldStyle}
                onFocus={e => (e.target.style.borderColor = "#1A3A8F")}
                onBlur={e => (e.target.style.borderColor = "#E5E7EB")}
              />
            </div>

            {error && (
              <p style={{ fontSize: 12, color: "#EF4444", margin: 0, lineHeight: 1.5 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "14px",
                backgroundColor: loading ? "#374151" : "#111827",
                color: "#fff", fontSize: 15, fontWeight: 700,
                borderRadius: 12, border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", letterSpacing: "-0.2px",
                marginTop: 4,
                transition: "background 0.15s",
              }}
            >
              {loading ? "Please wait…" : "Continue →"}
            </button>
          </form>

          {/* Mode toggle */}
          <p style={{ textAlign: "center", fontSize: 13, color: "#9CA3AF", margin: "20px 0 0" }}>
            {mode === "signup" ? (
              <>Already have an account?{" "}
                <button
                  onClick={() => { setMode("signin"); setError(""); }}
                  style={{ background: "none", border: "none", color: "#111827", fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0, fontFamily: "inherit" }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>Don&apos;t have an account?{" "}
                <button
                  onClick={() => { setMode("signup"); setError(""); }}
                  style={{ background: "none", border: "none", color: "#111827", fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0, fontFamily: "inherit" }}
                >
                  Create one
                </button>
              </>
            )}
          </p>

          {/* Terms */}
          <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", margin: "16px 0 0", lineHeight: 1.6 }}>
            By continuing you agree to our{" "}
            <Link href="/terms" style={{ color: "#6B7280", textDecoration: "underline" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" style={{ color: "#6B7280", textDecoration: "underline" }}>Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
