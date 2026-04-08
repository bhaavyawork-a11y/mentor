import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  const { data: replies, error } = await supabase
    .from("post_replies")
    .select("*, author:profiles!post_replies_author_id_fkey(id, full_name, current_job_role, avatar_url)")
    .eq("post_id", params.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ replies: replies ?? [] });
}
