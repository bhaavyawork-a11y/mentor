import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SEED_JOBS } from "@/data/seed-jobs";

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await supabase
    .from("job_listings")
    .upsert(SEED_JOBS, { onConflict: "external_id" });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, seeded: SEED_JOBS.length });
}
