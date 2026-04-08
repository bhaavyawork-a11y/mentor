import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await req.json() as { jobId: string };
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  // Check if already saved
  const { data: existing } = await supabase
    .from("saved_jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .single();

  if (existing) {
    // Unsave
    await supabase.from("saved_jobs").delete().eq("id", existing.id);
    return NextResponse.json({ saved: false });
  }

  // Save
  await supabase.from("saved_jobs").insert({ user_id: user.id, job_id: jobId });
  return NextResponse.json({ saved: true });
}
