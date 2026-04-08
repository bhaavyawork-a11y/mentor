import { createServerSupabaseClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { Star, BadgeCheck, Clock, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/stripe";
import BookingButton from "./BookingButton";
import type { Expert, Service } from "@/types";

export default async function ExpertDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabaseClient();

  const { data: expert } = await supabase
    .from("experts")
    .select("*, services(*)")
    .eq("id", params.id)
    .single();

  if (!expert) notFound();

  const e = expert as Expert & { services: Service[] };

  return (
    <div className="space-y-6">
      <Link href="/experts" className="inline-flex items-center gap-1.5 text-sm text-ink/40 hover:text-ink transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to experts
      </Link>

      <div className="card p-8 opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sage/20 to-sage/5 flex items-center justify-center text-sage font-display font-bold text-3xl border border-sage/10 shrink-0">
            {e.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-semibold text-ink">{e.full_name}</h1>
              {e.is_verified && <BadgeCheck className="w-5 h-5 text-sage" />}
            </div>
            <p className="text-ink/50 mt-1">{e.headline}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-mentor fill-amber-mentor" />
                <span className="text-sm font-semibold">{e.rating.toFixed(1)}</span>
                <span className="text-sm text-ink/30">({e.review_count} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5 text-ink/40">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{e.years_experience} years experience</span>
              </div>
            </div>
          </div>
        </div>

        {e.bio && (
          <p className="text-ink/60 text-sm leading-relaxed mt-6 pt-6 border-t border-cream-soft">
            {e.bio}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-6">
          {e.expertise_areas?.map((area) => (
            <span key={area} className="badge bg-sage/10 text-sage text-xs">{area}</span>
          ))}
        </div>
      </div>

      <div className="opacity-0 animate-fade-up animate-delay-100" style={{ animationFillMode: "forwards" }}>
        <h2 className="font-display font-semibold text-ink mb-4">Services</h2>
        <div className="space-y-3">
          {e.services?.filter(s => s.is_active).map((service) => (
            <div key={service.id} className="card p-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-ink text-sm">{service.title}</p>
                {service.description && <p className="text-xs text-ink/40 mt-1">{service.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <span className="badge bg-cream text-ink/50 text-xs">{service.duration_mins} min</span>
                  <span className="badge bg-cream text-ink/50 text-xs capitalize">{service.type}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-semibold text-ink text-xl">{formatPrice(service.price_cents)}</p>
                <div className="mt-2">
                  <BookingButton expertId={e.id} serviceId={service.id} size="small" />
                </div>
              </div>
            </div>
          ))}
          {(!e.services || e.services.length === 0) && (
            <div className="card p-8 text-center">
              <Users className="w-8 h-8 text-ink/20 mx-auto mb-2" />
              <p className="text-ink/40 text-sm">No services listed yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
