import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: Array<{ name: string; value: string; options: Parameters<typeof cookieStore.set>[2] }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {
              // Called from a Server Component — middleware will handle refresh
            }
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);

    if (session) {
      const user = session.user;

      // Upsert profile — returns existing row if already there
      const { data: profile } = await supabase.from("profiles").upsert(
        {
          id:         user.id,
          email:      user.email!,
          full_name:  user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        },
        { onConflict: "id", ignoreDuplicates: false }
      ).select("onboarding_completed, full_name, created_at").single();

      const isNewUser = !profile?.onboarding_completed &&
        (profile?.created_at
          ? new Date(profile.created_at) > new Date(Date.now() - 10_000)
          : true);

      // Send welcome email for new users (fire-and-forget)
      if (isNewUser && user.email) {
        sendWelcomeEmail({
          to:       user.email,
          userName: profile?.full_name || user.user_metadata?.name || user.email.split("@")[0],
        }).catch(console.error);
      }

      // New users → onboarding; returning users → feed
      if (isNewUser) {
        return NextResponse.redirect(new URL("/welcome", request.url));
      }
    }
  }

  return NextResponse.redirect(new URL("/communities", request.url));
}
