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
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "openid profile email",
      },
    });
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#fdf9f7" }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12"
        style={{ background: "#0f0f0f" }}
      >
        <Link href="/" style={{ fontSize: "20px", fontWeight: 800, color: "#ffffff" }}>
          mentor<span style={{ color: "#EDE986" }}>.</span>
        </Link>
        <div>
          <blockquote
            className="text-xl leading-relaxed font-light mb-6 max-w-sm"
            style={{ color: "#ffffff99" }}
          >
            "I went from senior engineer to engineering director in 8 months
            with the clarity Mentor gave me."
          </blockquote>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold"
              style={{ background: "#EDE986", color: "#0f0f0f" }}
            >
              AK
            </div>
            <div>
              <p className="text-[13px] font-medium" style={{ color: "#ffffff" }}>Ananya Kumar</p>
              <p className="text-[11px]" style={{ color: "#ffffff66" }}>Engineering Director, Stripe</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Goal Setting", "Expert Mentors", "Career Tracking"].map((t) => (
            <div
              key={t}
              className="px-3 py-2 rounded-lg text-[11px] text-center"
              style={{ background: "#ffffff0d", color: "#ffffff66" }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="lg:hidden inline-block mb-12"
            style={{ fontSize: "20px", fontWeight: 800, color: "#0f0f0f" }}
          >
            mentor<span style={{ color: "#EDE986" }}>.</span>
          </Link>

          <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f0f0f", marginBottom: "8px" }}>
            Welcome back
          </h1>
          <p className="text-[13px] mb-8" style={{ color: "#0f0f0f66" }}>
            Sign in to continue your career journey.
          </p>

          <button
            onClick={handleLinkedInLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl
                       text-white font-medium text-[13px] transition-all duration-200
                       hover:shadow-float active:scale-[0.98] disabled:opacity-60"
            style={{ background: "#0077B5" }}
          >
            <Linkedin className="w-5 h-5" />
            {loading ? "Connecting…" : "Continue with LinkedIn"}
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "#f0f0f0" }} />
            <span className="text-[11px]" style={{ color: "#0f0f0f44" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "#f0f0f0" }} />
          </div>

          <EmailForm />

          <p className="text-center text-[11px] mt-8" style={{ color: "#0f0f0f44" }}>
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:opacity-80">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:opacity-80">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
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

  if (sent) {
    return (
      <div className="text-center py-4">
        <p className="text-[13px]" style={{ color: "#0f0f0f66" }}>
          Magic link sent to <strong style={{ color: "#0f0f0f" }}>{email}</strong>. Check your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
        className="w-full btn-primary justify-center py-3 disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send magic link"}
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
}
