import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const communityId = params.id;

  const { error } = await supabase
    .from("community_members")
    .insert({ community_id: communityId, user_id: user.id, role: "member" });

  if (error && error.code !== "23505") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: c } = await supabase.from("communities").select("member_count").eq("id", communityId).single();
  await supabase.from("communities").update({ member_count: (c?.member_count ?? 0) + 1 }).eq("id", communityId);

  return NextResponse.json({ joined: true });
}
