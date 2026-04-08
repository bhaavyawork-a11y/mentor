import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendPayoutRequestedToExpert } from "@/lib/email";

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

export async function GET() {
  const supabase = makeSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: expert } = await supabase.from("experts").select("id").eq("user_id", session.user.id).single();
  if (!expert) return NextResponse.json([], { status: 200 });

  const { data, error } = await supabase
    .from("expert_payouts")
    .select("*")
    .eq("expert_id", expert.id)
    .order("requested_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const supabase = makeSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: expert } = await supabase
    .from("experts")
    .select("id, pending_payout_cents")
    .eq("user_id", session.user.id)
    .single();
  if (!expert) return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });

  const body = await req.json();
  const { amount_cents, method, upi_id, bank_account, bank_ifsc, bank_name } = body;

  if (!amount_cents || amount_cents <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  if (amount_cents > (expert.pending_payout_cents ?? 0)) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });

  // Create payout request
  const { data, error } = await supabase
    .from("expert_payouts")
    .insert({
      expert_id: expert.id,
      amount_cents,
      method:    method ?? "upi",
      upi_id,
      bank_account,
      bank_ifsc,
      bank_name,
      status:    "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduct from available balance
  await supabase.from("experts").update({
    pending_payout_cents: Math.max(0, (expert.pending_payout_cents ?? 0) - amount_cents),
    // Store payout details for future use
    ...(method === "upi"          ? { upi_id }                                                           : {}),
    ...(method === "bank_transfer" ? { bank_account_number: bank_account, bank_ifsc, bank_account_name: bank_name } : {}),
  }).eq("id", expert.id);

  // Send payout confirmation email
  const { data: { session: authSession } } = await supabase.auth.getSession();
  if (authSession?.user?.email) {
    const { data: expertRecord } = await supabase.from("experts").select("full_name").eq("id", expert.id).single();
    sendPayoutRequestedToExpert({
      to:         authSession.user.email,
      expertName: expertRecord?.full_name ?? "Expert",
      amountInr:  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount_cents / 100),
      method:     method ?? "upi",
      payoutId:   data.id,
    }).catch(console.error);
  }

  return NextResponse.json(data, { status: 201 });
}
