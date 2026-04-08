import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get communities user is in
  const { data: myComms } = await supabase
    .from("community_members")
    .select("community_id")
    .eq("user_id", user.id);

  const commIds = (myComms ?? []).map((m: { community_id: string }) => m.community_id);

  // Get people already followed
  const { data: alreadyFollowing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followedIds = [user.id, ...(alreadyFollowing ?? []).map((f: { following_id: string }) => f.following_id)];

  // Find people in same communities, not yet followed
  let candidates: Array<{ id: string; full_name: string | null; current_job_role: string | null; avatar_url: string | null }> = [];

  if (commIds.length > 0) {
    const { data: commMembers } = await supabase
      .from("community_members")
      .select("user_id, profiles:profiles!community_members_user_id_fkey(id, full_name, current_job_role, avatar_url)")
      .in("community_id", commIds)
      .not("user_id", "in", `(${followedIds.map((id) => `"${id}"`).join(",")})`)
      .limit(20);

    candidates = (commMembers ?? [])
      .map((m: { user_id: unknown; profiles: unknown }) => {
        const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return p as { id: string; full_name: string | null; current_job_role: string | null; avatar_url: string | null } | null;
      })
      .filter((p): p is NonNullable<typeof p> => !!p);
  }

  // If not enough, add random profiles
  if (candidates.length < 5) {
    const { data: extras } = await supabase
      .from("profiles")
      .select("id, full_name, current_job_role, avatar_url")
      .not("id", "in", `(${followedIds.map((id) => `"${id}"`).join(",")})`)
      .limit(5 - candidates.length);
    candidates = [...candidates, ...(extras ?? [])];
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = candidates.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  }).slice(0, 5);

  return NextResponse.json({ suggestions: unique });
}
