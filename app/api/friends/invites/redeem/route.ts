import { createClient } from "@/lib/supabase/server";
import {
  hashFriendInviteToken,
  verifyFriendInviteToken,
} from "@/lib/social/friend-invite-token";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RedeemBody = {
  token?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as RedeemBody | null;
    const token = typeof body?.token === "string" ? body.token : null;
    if (!token) return NextResponse.json({ error: "Invite token is required." }, { status: 400 });

    const payload = verifyFriendInviteToken(token);
    if (!payload) {
      return NextResponse.json({ error: "This invite is invalid or expired." }, { status: 410 });
    }

    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || typeof claimsData?.claims?.sub !== "string") {
      return NextResponse.json({ error: "You must be signed in to accept an invite." }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("redeem_friend_invite", {
      p_token_hash: hashFriendInviteToken(token),
    });
    if (error) throw error;

    return NextResponse.json({ status: data });
  } catch {
    return NextResponse.json({ error: "Could not redeem this friend invite." }, { status: 500 });
  }
}
