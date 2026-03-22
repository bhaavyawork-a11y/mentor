import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { score, xpEarned } = await req.json() as { score: number; xpEarned: number };
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;

    // Read current interview_xp first
    const { data: profile } = await supabase
      .from("profiles")
      .select("interview_xp")
      .eq("id", userId)
      .single();

    const currentXp = (profile?.interview_xp ?? 0) as number;

    await supabase.from("profiles").update({
      last_interview_score: score,
      last_interview_at: new Date().toISOString(),
      interview_xp: currentXp + xpEarned,
    }).eq("id", userId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("mock-interview-save error:", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
