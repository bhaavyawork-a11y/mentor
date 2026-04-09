import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { job_id, cover_note } = await req.json();
  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  // Check not already applied
  const { data: existing } = await supabase
    .from("job_applications")
    .select("id")
    .eq("job_id", job_id)
    .eq("applicant_id", user.id)
    .single();

  if (existing) return NextResponse.json({ error: "Already applied" }, { status: 409 });

  const { error } = await supabase.from("job_applications").insert({
    job_id,
    applicant_id: user.id,
    cover_note,
  });

  if (error) return NextResponse.json({ error: "Failed to apply" }, { status: 500 });

  return NextResponse.json({ success: true });
}
