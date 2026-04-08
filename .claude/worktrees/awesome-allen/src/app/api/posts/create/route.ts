import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const VALID_TYPES = ["note", "question", "win", "job", "referral_offer"];

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    content?: string;
    type?: string;
    community_id?: string;
    tags?: string[];
  };

  const { content, type = "note", community_id, tags } = body;

  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      community_id: community_id ?? null,
      type,
      content: content.trim(),
      tags: tags ?? [],
    })
    .select(`
      *,
      author:profiles!posts_author_id_fkey(id, full_name, current_job_role, avatar_url),
      community:communities(name, slug)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post }, { status: 201 });
}
