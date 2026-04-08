import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import FeedClient from "./FeedClient";
import type { FeedPost } from "./PostComposer";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const userId = session.user.id;

  // Fetch everything in parallel
  const [postsRes, profileRes, membershipsRes, followsRes, suggestionsRes, communitiesRes] = await Promise.all([
    // Posts with author + community
    supabase
      .from("posts")
      .select(`
        *,
        author:profiles!posts_author_id_fkey(id, full_name, current_job_role, avatar_url),
        community:communities(name, slug)
      `)
      .order("created_at", { ascending: false })
      .limit(20),

    // Current user's profile
    supabase.from("profiles").select("id, full_name, current_job_role, avatar_url").eq("id", userId).single(),

    // User's community memberships
    supabase.from("community_members").select("community_id").eq("user_id", userId),

    // People user follows
    supabase.from("follows").select("following_id").eq("follower_id", userId),

    // Follow suggestions (people in same communities, not yet followed)
    supabase
      .from("profiles")
      .select("id, full_name, current_job_role")
      .neq("id", userId)
      .limit(5),

    // Communities user is in (for right sidebar)
    supabase
      .from("community_members")
      .select("community_id, community:communities(id, name, slug, member_count)")
      .eq("user_id", userId),
  ]);

  const posts = (postsRes.data ?? []) as FeedPost[];
  const profile = profileRes.data;

  // Check liked status
  const postIds = posts.map((p) => p.id);
  let likedSet = new Set<string>();
  if (postIds.length > 0) {
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds);
    likedSet = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));
  }

  const enrichedPosts = posts.map((p) => ({ ...p, liked: likedSet.has(p.id) }));

  const joinedCommunityIds = (membershipsRes.data ?? []).map((m: { community_id: string }) => m.community_id);
  const followedUserIds = (followsRes.data ?? []).map((f: { following_id: string }) => f.following_id);
  const suggestions = suggestionsRes.data ?? [];

  type CommUnit = { id: string; name: string; slug: string; member_count: number };
  const myCommunities = (communitiesRes.data ?? [])
    .map((m: { community_id: unknown; community: unknown }) => {
      const c = Array.isArray(m.community) ? m.community[0] : m.community;
      return c as CommUnit | null;
    })
    .filter((c): c is CommUnit => !!c);

  const displayName = profile?.full_name ?? session.user.email?.split("@")[0] ?? "You";
  const userInitials = displayName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div style={{ backgroundColor: "#f3f2ef", minHeight: "100vh", padding: "24px 0" }}>
      <FeedClient
        initialPosts={enrichedPosts}
        currentUserId={userId}
        userInitials={userInitials}
        joinedCommunityIds={joinedCommunityIds}
        followedUserIds={followedUserIds}
        suggestions={suggestions}
        myCommunities={myCommunities}
      />
    </div>
  );
}
