import { NextResponse } from "next/server";
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

  const { data: expert } = await supabase.from("experts").select("id").eq("user_id", session.user.id).single();
  if (!expert) return NextResponse.json({ error: "Expert profile not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("bookings")
    .select("*, user:profiles(full_name), service:services(title, duration_mins, type)")
    .eq("expert_id", expert.id)
    .order("scheduled_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
