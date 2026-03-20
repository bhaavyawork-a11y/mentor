import Link from "next/link";
import { ArrowRight, Sparkles, Target, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <span className="font-display font-semibold text-lg tracking-tight text-ink">
          mentor<span className="text-sage">.</span>
        </span>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-secondary text-sm">
            Sign in
          </Link>
          <Link href="/auth/login" className="btn-primary text-sm">
            Get started <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 pt-20 pb-32">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sage/10 text-sage text-sm font-medium mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            Career guidance reimagined
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-semibold text-ink leading-[1.1] tracking-tight mb-6">
            Your next career
            <br />
            move, clarified.
          </h1>
          <p className="text-ink/60 text-lg leading-relaxed mb-10 max-w-lg">
            Set goals, track progress, and connect with expert mentors who've
            walked the path you want to take.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-primary px-6 py-3 text-base">
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/experts" className="btn-secondary px-6 py-3 text-base">
              Browse experts
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-24">
          {[
            {
              icon: Target,
              title: "Set clear goals",
              desc: "Define your target role, timeline, and the milestones in between.",
            },
            {
              icon: Sparkles,
              title: "Track your path",
              desc: "Visualise your career trajectory and mark wins along the way.",
            },
            {
              icon: Users,
              title: "Learn from experts",
              desc: "Book 1:1 sessions with mentors who've made the transition you want.",
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="card p-6 opacity-0 animate-fade-up"
              style={{ animationDelay: `${i * 100 + 200}ms`, animationFillMode: "forwards" }}
            >
              <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-sage" />
              </div>
              <h3 className="font-display font-semibold text-ink mb-2">{title}</h3>
              <p className="text-sm text-ink/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
