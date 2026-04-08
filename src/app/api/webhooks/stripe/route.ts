import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import {
  sendBookingConfirmedToUser,
  sendNewBookingToExpert,
} from "@/lib/email";

// Use service role client for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function formatINR(cents: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, serviceId, expertId } = session.metadata ?? {};

      if (userId && serviceId && expertId) {
        // Update booking status
        const { data: booking } = await supabaseAdmin
          .from("bookings")
          .update({
            status: "confirmed",
            paid_at: new Date().toISOString(),
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
          })
          .eq("stripe_checkout_session_id", session.id)
          .select("*, service:services(title, duration_mins), expert:experts(full_name, user_id), user:profiles(full_name)")
          .single();

        // Send emails
        if (booking) {
          const service  = Array.isArray(booking.service) ? booking.service[0] : booking.service;
          const expert   = Array.isArray(booking.expert)  ? booking.expert[0]  : booking.expert;
          const user     = Array.isArray(booking.user)    ? booking.user[0]    : booking.user;
          const amountInr = formatINR(booking.amount_cents ?? 0);

          // Email to user
          if (session.customer_email) {
            await sendBookingConfirmedToUser({
              to:           session.customer_email,
              userName:     user?.full_name ?? "there",
              expertName:   expert?.full_name ?? "your expert",
              serviceTitle: service?.title ?? "session",
              durationMins: service?.duration_mins ?? 60,
              amountInr,
              scheduledAt:  booking.scheduled_at ?? undefined,
              meetingUrl:   booking.meeting_url ?? undefined,
              bookingId:    booking.id,
            }).catch(console.error);
          }

          // Email to expert
          if (expert?.user_id) {
            const { data: expertProfile } = await supabaseAdmin
              .from("profiles")
              .select("email")
              .eq("id", expert.user_id)
              .single();

            if (expertProfile?.email) {
              await sendNewBookingToExpert({
                to:           expertProfile.email,
                expertName:   expert.full_name ?? "Expert",
                userName:     user?.full_name ?? "A user",
                serviceTitle: service?.title ?? "session",
                durationMins: service?.duration_mins ?? 60,
                amountInr,
                userNote:     booking.notes ?? undefined,
                bookingId:    booking.id,
              }).catch(console.error);
            }
          }
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await supabaseAdmin
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("stripe_payment_intent_id", intent.id);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
