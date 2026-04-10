import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const VALID_TITLES = [
  "HR Manager", "HR Business Partner", "Talent Acquisition", "Recruiter",
  "Technical Recruiter", "Head of HR", "VP of People", "Chief People Officer",
  "People Operations", "Hiring Manager", "Founder / CEO", "Co-founder",
  "Engineering Manager", "Team Lead", "Other",
];

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options ?? {})
              );
            } catch {}
          },
        },
      }
    );

    // ─── Auth check ────────────────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ─── Parse + validate ──────────────────────────────────────────────────────
    const { company_name, employer_title, linkedin_url } = await req.json() as {
      company_name: string;
      employer_title: string;
      linkedin_url?: string;
    };

    if (!company_name?.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }
    if (!employer_title?.trim()) {
      return NextResponse.json({ error: "Your title/role is required" }, { status: 400 });
    }
    if (!VALID_TITLES.includes(employer_title)) {
      return NextResponse.json({ error: "Please select a valid hiring role" }, { status: 400 });
    }

    // ─── Mark as employer verified ─────────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        is_employer_verified: true,
        employer_company: company_name.trim(),
        employer_title: employer_title.trim(),
        employer_verified_at: new Date().toISOString(),
        // Also update LinkedIn if provided and not already set
        ...(linkedin_url?.trim() ? { linkedin_url: linkedin_url.trim() } : {}),
      })
      .eq("id", user.id);

    if (updateErr) {
      console.error("Employer registration error:", updateErr);
      return NextResponse.json({ error: "Failed to complete registration" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Employer register API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
