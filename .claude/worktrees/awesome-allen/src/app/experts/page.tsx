import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Star, BadgeCheck, Clock, ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/stripe";
import type { Expert, Service } from "@/types";

export const metadata = { title: "Experts" };

export default async function ExpertsPage() {
  const supabase = await createServerSupabaseClient();

  const { data: experts } = await supabase
    .from("experts")
    .select("*, services(*)")
    .eq("is_active", true)
    .order("rating", { ascending: false });

  const allExperts = (experts as (Expert & { services: Service[] })[] | null) ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
        <h1 className="font-display text-3xl font-semibold text-ink">Experts</h1>
        <p className="text-ink/50 mt-1 text-sm">
          Book a session with a mentor who's been where you want to go.
        </p>
      </div>

      {/* Search bar (UI only – wire up with server action or client filter) */}
      <div
        className="relative opacity-0 animate-fade-up animate-delay-100"
        style={{ animationFillMode: "forwards" }}
      >
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
        <input
          className="input pl-10 w-full max-w-md"
          placeholder="Search by expertise, role, industry…"
        />
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-2 gap-5">
        {allExperts.map((expert, i) => (
          <ExpertCard key={expert.id} expert={expert} index={i} />
        ))}
      </div>

      {allExperts.length === 0 && (
        <div className="card p-16 text-center">
          <p className="text-ink/30 text-sm">No experts available yet.</p>
        </div>
      )}
    </div>
  );
}

function ExpertCard({
  expert,
  index,
}: {
  expert: Expert & { services: Service[] };
  index: number;
}) {
  const lowestService = expert.services
    ?.filter((s) => s.is_active)
    .sort((a, b) => a.price_cents - b.price_cents)[0];

  return (
    <div
      className="card p-6 hover:shadow-card-hover transition-all duration-300 group opacity-0 animate-fade-up"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "forwards" }}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sage/20 to-sage/5 flex items-center justify-center shrink-0 text-sage font-display font-semibold text-xl border border-sage/10">
          {expert.full_name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display font-semibold text-ink text-base">{expert.full_name}</h3>
            {expert.is_verified && (
              <BadgeCheck className="w-4 h-4 text-sage shrink-0" />
            )}
          </div>
          <p className="text-xs text-ink/50 mt-0.5 leading-relaxed">{expert.headline}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-mentor fill-amber-mentor" />
              <span className="text-xs font-semibold text-ink">{expert.rating.toFixed(1)}</span>
              <span className="text-xs text-ink/30">({expert.review_count})</span>
            </div>
            <div className="flex items-center gap-1 text-ink/30">
              <Clock className="w-3 h-3" />
              <span className="text-xs">{expert.years_experience}y exp</span>
            </div>
          </div>
        </div>
        {lowestService && (
          <div className="text-right shrink-0">
            <p className="text-xs text-ink/30">from</p>
            <p className="font-display font-semibold text-ink text-lg">
              {formatPrice(lowestService.price_cents)}
            </p>
          </div>
        )}
      </div>

      {/* Expertise tags */}
      {expert.expertise_areas?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {expert.expertise_areas.slice(0, 4).map((area) => (
            <span
              key={area}
              className="badge bg-cream text-ink/50 text-xs"
            >
              {area}
            </span>
          ))}
          {expert.expertise_areas.length > 4 && (
            <span className="badge bg-cream text-ink/30 text-xs">
              +{expert.expertise_areas.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Services preview */}
      {expert.services && expert.services.length > 0 && (
        <div className="space-y-2 mb-4">
          {expert.services.slice(0, 2).map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between py-2 px-3 rounded-xl bg-cream hover:bg-cream-soft transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-ink">{service.title}</p>
                <p className="text-xs text-ink/40">{service.duration_mins} min · {service.type}</p>
              </div>
              <p className="text-xs font-semibold text-ink">
                {formatPrice(service.price_cents)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/experts/${expert.id}`}
        className="w-full btn-primary justify-center text-sm group-hover:shadow-float"
      >
        View profile & book
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}
