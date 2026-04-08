import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { sendSessionConfirmedToUser, sendSessionCompletedToUser } from "@/lib/email";

export const dynamic = "force-dynamic";

// Service-role client for fetching user email (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function makeSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(list: Array<{ name: string; value: string; options: unknown }>) {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])); } catch {}
        },
      },
    }
  );
}

async function generateGoogleMeetLink(expert: { google_refresh_token: string | null }, booking: {
  id: string; scheduled_at: string | null; service: { title: string; duration_mins: number } | null;
}): Promise<string | null> {
  if (!expert.google_refresh_token) return null;

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    // Refresh access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: expert.google_refresh_token,
        grant_type:    "refresh_token",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return null;

    const startTime = booking.scheduled_at ? new Date(booking.scheduled_at) : new Date();
    const endTime   = new Date(startTime.getTime() + (booking.service?.duration_mins ?? 60) * 60 * 1000);

    // Create Calendar event with Google Meet
    const eventRes = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${tokenData.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Mentor Session: ${booking.service?.title ?? "Session"}`,
          start:   { dateTime: startTime.toISOString(), timeZone: "Asia/Kolkata" },
          end:     { dateTime: endTime.toISOString(),   timeZone: "Asia/Kolkata" },
          conferenceData: {
            createRequest: {
              requestId:            booking.id,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      }
    );
    const event = await eventRes.json();
    return event.hangoutLink ?? null;
  } catch {
    return null;
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = makeSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify expert ownership
  const { data: expert } = await supabase
    .from("experts")
    .select("id, full_name, google_refresh_token")
    .eq("user_id", session.user.id)
    .single();
  if (!expert) return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });

  // Verify this booking belongs to this expert
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, service:services(title, duration_mins)")
    .eq("id", params.id)
    .eq("expert_id", expert.id)
    .single();
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const body = await req.json();
  const update: Record<string, unknown> = {};

  if (body.status) {
    const allowed = ["pending", "confirmed", "completed", "cancelled", "refunded"];
    if (!allowed.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    update.status = body.status;

    // Auto-update expert's total_earned when marking complete
    if (body.status === "completed" && booking.amount_cents) {
      const { data: currentExpert } = await supabase
        .from("experts")
        .select("total_earned_cents, pending_payout_cents")
        .eq("id", expert.id)
        .single();
      if (currentExpert) {
        await supabase.from("experts").update({
          total_earned_cents:   (currentExpert.total_earned_cents ?? 0) + booking.amount_cents,
          pending_payout_cents: (currentExpert.pending_payout_cents ?? 0) + booking.amount_cents,
        }).eq("id", expert.id);
      }
    }
  }

  // Generate Google Meet link
  if (body.generate_meet || (body.status === "confirmed" && !booking.meeting_url)) {
    const service = Array.isArray(booking.service) ? booking.service[0] : booking.service;
    const meetUrl = await generateGoogleMeetLink(expert, { ...booking, service });
    if (meetUrl) update.meeting_url = meetUrl;
  }

  if (body.meeting_url) update.meeting_url = body.meeting_url;
  if (body.notes)       update.notes       = body.notes;

  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .update(update)
    .eq("id", params.id)
    .select("*, user:profiles(full_name), service:services(title, duration_mins, type)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Fire emails based on new status ────────────────────────────────────────
  if (body.status === "confirmed" || body.status === "completed") {
    try {
      const updatedService = Array.isArray(data.service) ? data.service[0] : data.service;
      const updatedUser    = Array.isArray(data.user)    ? data.user[0]    : data.user;

      // Get user email via admin client (RLS would block this otherwise)
      const { data: userProfile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", booking.user_id)
        .single();

      if (userProfile?.email) {
        if (body.status === "confirmed") {
          await sendSessionConfirmedToUser({
            to:          userProfile.email,
            userName:    updatedUser?.full_name ?? "there",
            expertName:  expert.full_name ?? "your expert",
            serviceTitle: updatedService?.title ?? "session",
            scheduledAt: booking.scheduled_at ?? undefined,
            meetingUrl:  (update.meeting_url as string | undefined) ?? booking.meeting_url ?? undefined,
          });
        } else if (body.status === "completed") {
          await sendSessionCompletedToUser({
            to:          userProfile.email,
            userName:    updatedUser?.full_name ?? "there",
            expertName:  expert.full_name ?? "your expert",
            serviceTitle: updatedService?.title ?? "session",
            expertId:    expert.id,
          });
        }
      }
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
      // Don't fail the request — booking update succeeded
    }
  }

  return NextResponse.json(data);
}
