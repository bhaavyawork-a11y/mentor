import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { target_id } = await req.json() as { target_id?: string };
  if (!target_id) return NextResponse.json({ error: "target_id required" }, { status: 400 });
  if (target_id === user.id) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", target_id)
    .single();

  if (existing) {
    await supabase.from("follows").delete().eq("id", existing.id);
    return NextResponse.json({ following: false });
  }

  await supabase.from("follows").insert({ follower_id: user.id, following_id: target_id });
  return NextResponse.json({ following: true });
}
