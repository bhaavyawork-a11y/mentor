import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { Calendar, Clock, Video, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import BookingSuccessBanner from "./SuccessBanner";
import type { Booking } from "@/types";

export const metadata = { title: "Bookings" };

const statusStyles: Record<string, string> = {
  confirmed: "bg-sage/10 text-sage",
  pending: "bg-amber-mentor/10 text-amber-mentor",
  completed: "bg-cream text-ink/40",
  cancelled: "bg-red-50 text-red-500",
  refunded: "bg-gray-50 text-gray-400",
};

export default async function BookingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, expert:experts(full_name, headline), service:services(title, duration_mins, type)")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  const all = (bookings as Booking[] | null) ?? [];

  return (
    <div className="space-y-8">
      <Suspense>
        <BookingSuccessBanner />
      </Suspense>

      <div className="flex items-center justify-between opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Bookings</h1>
          <p className="text-ink/50 mt-1 text-sm">Your scheduled and past sessions.</p>
        </div>
        <Link href="/experts" className="btn-primary text-sm">Book a session <ArrowRight className="w-4 h-4" /></Link>
      </div>

      {all.length === 0 ? (
        <div className="card p-20 text-center opacity-0 animate-fade-up animate-delay-100" style={{ animationFillMode: "forwards" }}>
          <Calendar className="w-10 h-10 text-ink/15 mx-auto mb-4" />
          <p className="font-medium text-ink/40 text-sm mb-1">No bookings yet</p>
          <p className="text-xs text-ink/30 mb-6">Browse our experts and book your first session.</p>
          <Link href="/experts" className="btn-sage text-sm">Browse experts</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {all.map((booking, i) => {
            const expert = (booking.expert as any);
            const service = (booking.service as any);
            return (
              <div key={booking.id} className="card p-5 opacity-0 animate-fade-up" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "forwards" }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center text-sage font-semibold shrink-0">
                    {expert?.full_name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-ink text-sm">{expert?.full_name ?? "Expert"}</p>
                      <span className={cn("badge text-xs capitalize", statusStyles[booking.status])}>{booking.status}</span>
                    </div>
                    <p className="text-xs text-ink/50 mt-0.5">{service?.title ?? "Session"}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {booking.scheduled_at && (
                        <div className="flex items-center gap-1 text-ink/40">
                          <Calendar className="w-3 h-3" />
                          <span className="text-xs">{new Date(booking.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      )}
                      {service?.duration_mins && (
                        <div className="flex items-center gap-1 text-ink/40">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">{service.duration_mins} min</span>
                        </div>
                      )}
                      {booking.amount_cents && <span className="text-xs text-ink/40">{formatPrice(booking.amount_cents, booking.currency)}</span>}
                    </div>
                  </div>
                  {booking.meeting_url && booking.status === "confirmed" && (
                    <a href={booking.meeting_url} target="_blank" rel="noopener noreferrer" className="btn-sage text-xs shrink-0">
                      <Video className="w-3.5 h-3.5" /> Join
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
