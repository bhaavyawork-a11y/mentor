import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

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

    // ─── Parse request ─────────────────────────────────────────────────────────
    const { community_id, invitee_email } = await req.json() as {
      community_id: string;
      invitee_email: string;
    };

    if (!community_id || !invitee_email) {
      return NextResponse.json({ error: "community_id and invitee_email are required" }, { status: 400 });
    }

    if (!isValidEmail(invitee_email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    // ─── Verify user is approved member ─────────────────────────────────────────
    const { data: membership } = await supabase
      .from("community_members")
      .select("status")
      .eq("community_id", community_id)
      .eq("user_id", user.id)
      .single();

    if (membership?.status !== "approved") {
      return NextResponse.json({ error: "Must be an approved member of this community" }, { status: 403 });
    }

    // ─── Count existing invites sent by this user for this community ────────────
    const { data: existingInvites, error: countErr } = await supabase
      .from("community_invites")
      .select("id")
      .eq("inviter_id", user.id)
      .eq("community_id", community_id)
      .eq("status", "pending");

    if (countErr) {
      console.error("Error counting invites:", countErr);
      return NextResponse.json({ error: "Failed to check invites" }, { status: 500 });
    }

    const inviteCount = (existingInvites ?? []).length;
    if (inviteCount >= 3) {
      return NextResponse.json({ error: "You have used all 3 invites for this group" }, { status: 429 });
    }

    // ─── Insert invite ─────────────────────────────────────────────────────────
    const { data: newInvite, error: insertErr } = await supabase
      .from("community_invites")
      .insert({
        inviter_id: user.id,
        community_id,
        invitee_email: invitee_email.toLowerCase().trim(),
        status: "pending",
      })
      .select("id, token")
      .single();

    if (insertErr || !newInvite) {
      console.error("Error inserting invite:", insertErr);
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }

    // Record career event for invite sent (best-effort, non-blocking)
    try {
      await supabase.from("career_events").insert({
        user_id: user.id,
        event_type: "invite_sent",
        community_id: community_id,
        metadata: { invitee_email: invitee_email.toLowerCase().trim() },
      });
    } catch { /* ignore */ }

    const invitesRemaining = 3 - inviteCount - 1;

    return NextResponse.json({
      success: true,
      token: newInvite.token,
      invites_remaining: invitesRemaining,
    });

  } catch (error) {
    console.error("Invite API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
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

    // ─── Get query params ──────────────────────────────────────────────────────
    const { searchParams } = new URL(req.url);
    const communityId = searchParams.get("communityId");

    if (!communityId) {
      return NextResponse.json({ error: "communityId query param required" }, { status: 400 });
    }

    // ─── Fetch invites ─────────────────────────────────────────────────────────
    const { data: invites } = await supabase
      .from("community_invites")
      .select("id, invitee_email, status, created_at, expires_at, token")
      .eq("inviter_id", user.id)
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });

    const invitesList = (invites ?? []).map(inv => ({
      id: inv.id,
      email: inv.invitee_email,
      status: inv.status,
      created_at: inv.created_at,
      expires_at: inv.expires_at,
      token: inv.token,
      link: `${process.env.NEXT_PUBLIC_APP_URL || "https://mentor.app"}/invite/${inv.token}`,
    }));

    // Count pending invites
    const pendingCount = (invites ?? []).filter(inv => inv.status === "pending").length;
    const invitesRemaining = 3 - pendingCount;

    return NextResponse.json({
      invites: invitesList,
      invites_remaining: invitesRemaining,
      count: invitesList.length,
    });

  } catch (error) {
    console.error("Invite GET API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
