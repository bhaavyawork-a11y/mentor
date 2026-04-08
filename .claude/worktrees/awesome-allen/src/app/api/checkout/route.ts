import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{name: string; value: string; options: any}>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // no-op in Server Component context
          }
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceId, expertId } = await req.json();

  // Fetch service details
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*, expert:experts(full_name)")
    .eq("id", serviceId)
    .single();

  if (serviceError || !service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: session.user.email,
      line_items: [
        {
          price_data: {
            currency: service.currency ?? "usd",
            unit_amount: service.price_cents,
            product_data: {
              name: service.title,
              description: `Session with ${(service.expert as { full_name: string })?.full_name ?? "Expert"} · ${service.duration_mins} min`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/experts/${expertId}`,
      metadata: {
        userId: session.user.id,
        serviceId,
        expertId,
      },
    });

    // Create pending booking record
    await supabase.from("bookings").insert({
      user_id: session.user.id,
      expert_id: expertId,
      service_id: serviceId,
      status: "pending",
      amount_cents: service.price_cents,
      currency: service.currency ?? "usd",
      stripe_checkout_session_id: checkoutSession.id,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
