import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json() as { content?: string };
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const postId = params.id;

  const { data: reply, error } = await supabase
    .from("post_replies")
    .insert({ post_id: postId, author_id: user.id, content: content.trim() })
    .select("*, author:profiles!post_replies_author_id_fkey(id, full_name, current_job_role, avatar_url)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: p } = await supabase.from("posts").select("replies_count").eq("id", postId).single();
  await supabase.from("posts").update({ replies_count: (p?.replies_count ?? 0) + 1 }).eq("id", postId);

  return NextResponse.json({ reply }, { status: 201 });
}
