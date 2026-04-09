import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  // Fetch membership count
  const { count: groupCount } = await supabase
    .from("community_members")
    .select("id", { count: "exact" })
    .eq("user_id", session.user.id)
    .eq("status", "approved");

  // Fetch post count
  const { count: postCount } = await supabase
    .from("community_posts")
    .select("id", { count: "exact" })
    .eq("user_id", session.user.id);

  // Format member since date
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Recently";

  return (
    <div className="space-y-8">
      <div className="opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
        <h1 className="font-display text-3xl font-semibold text-ink">Profile</h1>
        <p className="text-ink/50 mt-1 text-sm">
          Your career story. Keep it updated to get better matches.
        </p>
      </div>
      <ProfileForm profile={profile} userId={session.user.id} memberSince={memberSince} groupCount={groupCount || 0} postCount={postCount || 0} />
    </div>
  );
}
