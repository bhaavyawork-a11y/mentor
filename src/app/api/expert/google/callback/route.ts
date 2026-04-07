import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/expert-dashboard?google_error=access_denied`);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = `${appUrl}/api/expert/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/expert-dashboard?google_error=not_configured`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
        code,
      }),
    });
    const tokens = await tokenRes.json();

    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${appUrl}/expert-dashboard?google_error=no_refresh_token`);
    }

    // Store refresh token in expert record
    const supabase = makeSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.redirect(`${appUrl}/login`);

    await supabase
      .from("experts")
      .update({
        google_refresh_token: tokens.refresh_token,
        google_connected:     true,
      })
      .eq("user_id", session.user.id);

    return NextResponse.redirect(`${appUrl}/expert-dashboard?google_connected=1`);
  } catch {
    return NextResponse.redirect(`${appUrl}/expert-dashboard?google_error=token_exchange_failed`);
  }
}
