import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const postId = params.id;

  const { data: existing } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await supabase.from("post_likes").delete().eq("id", existing.id);
    const { data: p } = await supabase.from("posts").select("likes_count").eq("id", postId).single();
    const newCount = Math.max(0, (p?.likes_count ?? 1) - 1);
    await supabase.from("posts").update({ likes_count: newCount }).eq("id", postId);
    return NextResponse.json({ liked: false, count: newCount });
  }

  await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
  const { data: p } = await supabase.from("posts").select("likes_count").eq("id", postId).single();
  const newCount = (p?.likes_count ?? 0) + 1;
  await supabase.from("posts").update({ likes_count: newCount }).eq("id", postId);
  return NextResponse.json({ liked: true, count: newCount });
}
