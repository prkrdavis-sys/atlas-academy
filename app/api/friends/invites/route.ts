import { createClient } from "@/lib/supabase/server";
import {
  createFriendInviteToken,
  hashFriendInviteToken,
  verifyFriendInviteToken,
} from "@/lib/social/friend-invite-token";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const INVITE_LIFETIME_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Invite token is required." }, { status: 400 });

    const payload = verifyFriendInviteToken(token);
    if (!payload) {
      return NextResponse.json({ error: "This invite is invalid or expired." }, { status: 410 });
    }

    return NextResponse.json({
      inviterName: payload.displayName,
      expiresAt: payload.expiresAt,
    });
  } catch {
    return NextResponse.json({ error: "This invite is unavailable." }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (claimsError || typeof userId !== "string") {
      return NextResponse.json({ error: "You must be signed in to create an invite." }, { status: 401 });
    }

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    if (playerError) throw playerError;

    const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS);
    const token = createFriendInviteToken(player?.display_name ?? "An Atlas Academy player", expiresAt);
    const { error: inviteError } = await supabase.rpc("create_friend_invite", {
      p_token_hash: hashFriendInviteToken(token),
      p_expires_at: expiresAt.toISOString(),
    });
    if (inviteError) throw inviteError;

    return NextResponse.json({
      token,
      url: `/invite/${encodeURIComponent(token)}`,
      inviterName: player?.display_name ?? "An Atlas Academy player",
      expiresAt: expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: "Could not create a friend invite." }, { status: 500 });
  }
}
