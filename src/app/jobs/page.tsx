import { createServerSupabaseClient } from "@/lib/supabase-server";
import JobsClient, { type JobRow } from "./JobsClient";

export const metadata = { title: "Jobs for you" };

export default async function JobsPage() {
  const supabase = createServerSupabaseClient();

  // Current user
  const { data: { user } } = await supabase.auth.getUser();

  // Profile (for target_role)
  const { data: profile } = user
    ? await supabase.from("profiles").select("target_role").eq("id", user.id).single()
    : { data: null };

  // Active job listings, newest first
  const { data: jobs } = await supabase
    .from("job_listings")
    .select("id, external_id, source, title, company_name, company_slug, company_domain, location, department, job_type, apply_url, description_snippet, posted_at")
    .eq("is_active", true)
    .order("posted_at", { ascending: false })
    .limit(200);

  // Saved job IDs for the current user
  const { data: savedRows } = user
    ? await supabase.from("saved_jobs").select("job_id").eq("user_id", user.id)
    : { data: [] };

  const savedJobIds = new Set((savedRows ?? []).map((r: { job_id: string }) => r.job_id));

  return (
    <JobsClient
      jobs={(jobs ?? []) as JobRow[]}
      savedJobIds={Array.from(savedJobIds)}
      targetRole={(profile as { target_role?: string | null } | null)?.target_role}
      userProfile={profile as Record<string, unknown> | null}
    />
  );
}
