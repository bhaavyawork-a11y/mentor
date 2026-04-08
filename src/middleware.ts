import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// All core app routes require auth. Unauthenticated users are sent to
// /auth/login?next=<original_path> so they land on the right page after sign-in.
const PROTECTED = [
  "/feed", "/communities", "/jobs", "/assistant",
  "/experts", "/messages", "/profile", "/dashboard",
  "/goals", "/bookings", "/tracker", "/salaries",
  "/offer", "/resume", "/mock-interview",
];
const AUTH_ROUTES = ["/auth/login"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{name: string; value: string; options: any}>) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — required for SSR token rotation
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Redirect authenticated users away from auth pages
  if (session && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const next = req.nextUrl.searchParams.get("next") ?? "/feed";
    return NextResponse.redirect(new URL(next, req.url));
  }

  // Redirect unauthenticated users to login
  if (!session && PROTECTED.some((r) => pathname.startsWith(r))) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};
