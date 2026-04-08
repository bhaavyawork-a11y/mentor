import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    referrer_id?: string;
    community_id?: string;
    company?: string;
    role?: string;
    message?: string;
    post_id?: string;
  };

  const { referrer_id, community_id, company, role, message, post_id } = body;
  if (!referrer_id || !company) return NextResponse.json({ error: "referrer_id and company required" }, { status: 400 });

  const { data, error } = await supabase
    .from("referral_requests")
    .insert({
      requester_id: user.id,
      referrer_id,
      community_id: community_id ?? null,
      post_id: post_id ?? null,
      company,
      role: role ?? null,
      message: message ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Request already sent" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ request: data }, { status: 201 });
}
