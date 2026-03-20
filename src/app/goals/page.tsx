import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import GoalsClient from "./GoalsClient";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/auth/login");

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="opacity-0 animate-fade-up" style={{ animationFillMode: "forwards" }}>
        <h1 className="font-display text-3xl font-semibold text-ink">Goals</h1>
        <p className="text-ink/50 mt-1 text-sm">Your career milestones and next moves.</p>
      </div>
      <GoalsClient goals={goals ?? []} userId={session.user.id} />
    </div>
  );
}
