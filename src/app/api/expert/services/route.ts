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

async function getExpertId(supabase: ReturnType<typeof makeSupabase>, userId: string): Promise<string | null> {
  const { data } = await supabase.from("experts").select("id").eq("user_id", userId).single();
  return data?.id ?? null;
}

export async function GET() {
  const supabase = makeSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expertId = await getExpertId(supabase, session.user.id);
  if (!expertId) return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });

  const { data, error } = await supabase.from("services").select("*").eq("expert_id", expertId).order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = makeSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expertId = await getExpertId(supabase, session.user.id);
  if (!expertId) return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });

  const body = await req.json();
  const { title, description, type, duration_mins, price_cents, is_active } = body;

  if (!title)        return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!price_cents)  return NextResponse.json({ error: "price_cents is required" }, { status: 400 });

  const { data, error } = await supabase.from("services").insert({
    expert_id:    expertId,
    title, description,
    type:         type ?? "session",
    duration_mins: duration_mins ?? 60,
    price_cents,
    currency:     "inr",
    is_active:    is_active ?? true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
