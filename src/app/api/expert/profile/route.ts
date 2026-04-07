import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function makeSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(list: Array<{ name: string; value: string; options: unknown }>) {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])); } catch {}
        },
      },
    }
  );
}

export async function GET() {
  const supabase = makeSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("experts")
    .select("*")
    .eq("user_id", session.user.id)
    .single();

  if (error && error.code !== "PGRST116") return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}

export async function POST(req: NextRequest) {
  const supabase = makeSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    full_name, headline, bio, linkedin_url,
    years_experience, expertise_areas, industries,
  } = body;

  if (!full_name) return NextResponse.json({ error: "full_name is required" }, { status: 400 });

  // Check if expert profile already exists
  const { data: existing } = await supabase
    .from("experts")
    .select("id")
    .eq("user_id", session.user.id)
    .single();

  const payload = {
    full_name, headline, bio, linkedin_url,
    years_experience: years_experience ?? 0,
    expertise_areas: expertise_areas ?? [],
    industries: industries ?? [],
    updated_at: new Date().toISOString(),
  };

  let data, error;
  if (existing) {
    ({ data, error } = await supabase
      .from("experts")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from("experts")
      .insert({ ...payload, user_id: session.user.id, is_active: true })
      .select()
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
