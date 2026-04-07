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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = makeSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expertId = await getExpertId(supabase, session.user.id);
  if (!expertId) return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });

  const body   = await req.json();
  const update: Record<string, unknown> = {};
  const allowed = ["title", "description", "type", "duration_mins", "price_cents", "is_active"];
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("services")
    .update(update)
    .eq("id", params.id)
    .eq("expert_id", expertId) // ensures ownership
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = makeSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const expertId = await getExpertId(supabase, session.user.id);
  if (!expertId) return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });

  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", params.id)
    .eq("expert_id", expertId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
