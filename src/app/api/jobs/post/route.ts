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

  const body = await req.json();
  const {
    community_id, title, description, role_type,
    experience_min, experience_max, location, remote_ok,
    compensation_min, compensation_max,
    application_email, application_url,
    company_name, company_website, company_industry, company_size
  } = body;

  if (!community_id || !title || !description || !role_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Upsert company (simple — create if doesn't exist for this user)
  let companyId: string;
  const { data: existingCompany } = await supabase
    .from("companies")
    .select("id")
    .eq("posted_by", user.id)
    .eq("name", company_name)
    .single();

  if (existingCompany) {
    companyId = existingCompany.id;
  } else {
    const { data: newCompany, error: companyErr } = await supabase
      .from("companies")
      .insert({ name: company_name, website: company_website, industry: company_industry, size: company_size, posted_by: user.id })
      .select("id")
      .single();
    if (companyErr || !newCompany) return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
    companyId = newCompany.id;
  }

  // Create job posting
  const { data: job, error: jobErr } = await supabase
    .from("job_postings")
    .insert({
      company_id: companyId,
      community_id,
      posted_by: user.id,
      title, description, role_type,
      experience_min, experience_max,
      location, remote_ok,
      compensation_min, compensation_max,
      application_email, application_url,
    })
    .select("id")
    .single();

  if (jobErr || !job) return NextResponse.json({ error: "Failed to create job posting" }, { status: 500 });

  // Also create a community_post in the job_board channel so it appears in the group feed
  const postContent = `**${company_name}** is hiring a **${title}**\n\n${description.slice(0, 300)}${description.length > 300 ? "..." : ""}\n\n${location ? `📍 ${location}` : ""}${remote_ok ? " · Remote OK" : ""}${compensation_min ? ` · ₹${compensation_min}-${compensation_max}L` : ""}\n\njob_id:${job.id}`;

  await supabase.from("community_posts").insert({
    community_id,
    user_id: user.id,
    channel_type: "job_board",
    type: "Job Listing",
    content: postContent,
  });

  return NextResponse.json({ success: true, job_id: job.id });
}
