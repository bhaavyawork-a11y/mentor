import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const communityId = searchParams.get("community_id");

  let query = supabase
    .from("posts")
    .select(`
      *,
      author:profiles!posts_author_id_fkey(id, full_name, current_job_role, avatar_url),
      community:communities(name, slug)
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (communityId) query = query.eq("community_id", communityId);

  const { data: posts, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach liked status for current user
  let likedSet = new Set<string>();
  if (user && posts && posts.length > 0) {
    const postIds = posts.map((p: { id: string }) => p.id);
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds);
    likedSet = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
  }

  const enriched = (posts ?? []).map((p: { id: string }) => ({ ...p, liked: likedSet.has(p.id) }));
  return NextResponse.json({ posts: enriched });
}
