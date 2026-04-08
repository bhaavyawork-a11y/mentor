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

  await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", user.id);

  const { data: c } = await supabase.from("communities").select("member_count").eq("id", communityId).single();
  await supabase.from("communities").update({ member_count: Math.max(0, (c?.member_count ?? 1) - 1) }).eq("id", communityId);

  return NextResponse.json({ left: true });
}
