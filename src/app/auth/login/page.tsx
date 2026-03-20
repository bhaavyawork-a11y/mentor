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
    <div className="min-h-screen bg-cream flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-ink flex-col justify-between p-12">
        <Link href="/" className="font-display font-semibold text-lg text-cream tracking-tight">
          mentor<span className="text-sage">.</span>
        </Link>
        <div>
          <blockquote className="text-cream/80 text-xl leading-relaxed font-light mb-6 max-w-sm">
            "I went from senior engineer to engineering director in 8 months
            with the clarity Mentor gave me."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sage/30 flex items-center justify-center text-sage font-semibold text-sm">
              AK
            </div>
            <div>
              <p className="text-cream text-sm font-medium">Ananya Kumar</p>
              <p className="text-cream/40 text-xs">Engineering Director, Stripe</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {["Goal Setting", "Expert Mentors", "Career Tracking"].map((t) => (
            <div key={t} className="px-3 py-2 rounded-lg bg-white/5 text-cream/40 text-xs text-center">
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="lg:hidden inline-block font-display font-semibold text-lg text-ink tracking-tight mb-12">
            mentor<span className="text-sage">.</span>
          </Link>

          <h1 className="font-display text-2xl font-semibold text-ink mb-2">
            Welcome back
          </h1>
          <p className="text-ink/50 text-sm mb-8">
            Sign in to continue your career journey.
          </p>

          <button
            onClick={handleLinkedInLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl
                       bg-[#0077B5] text-white font-medium text-sm transition-all duration-200
                       hover:bg-[#006097] hover:shadow-float active:scale-[0.98] disabled:opacity-60"
          >
            <Linkedin className="w-5 h-5" />
            {loading ? "Connecting…" : "Continue with LinkedIn"}
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-cream-muted" />
            <span className="text-ink/30 text-xs">or</span>
            <div className="flex-1 h-px bg-cream-muted" />
          </div>

          {/* Email magic link form */}
          <EmailForm />

          <p className="text-center text-xs text-ink/30 mt-8">
            By continuing, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-ink/60">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-ink/60">
              Privacy Policy
            </Link>
            .
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
        <p className="text-sm text-ink/60">
          Magic link sent to <strong className="text-ink">{email}</strong>. Check
          your inbox.
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
