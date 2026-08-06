import { createClient } from "@/lib/supabase/client";
import type {
  FriendshipRow,
  HeadToHeadRecord,
  MatchRow,
  PlayerRow,
} from "@/lib/social/types";

const supabase = createClient();

const PLAYER_COLUMNS = "id,email,friend_code,display_name,avatar_id,avatar_color";
const FRIENDSHIP_COLUMNS = "id,requester_id,addressee_id,status,created_at";
const MATCH_COLUMNS =
  "id,host_id,guest_id,status,settings,seed,question_count,host_score,guest_score,winner_id,created_at,started_at,ended_at";

export function friendCodeInputIsCode(value: string): boolean {
  return !value.includes("@");
}

export function formatFriendCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

export async function loadOwnPlayer(userId: string): Promise<PlayerRow | null> {
  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as PlayerRow | null) ?? null;
}

/**
 * Keeps the public directory row in step with the active profile so friends see
 * the name and avatar the player is currently using.
 */
export async function syncOwnPlayer(
  userId: string,
  fields: { displayName: string; avatarId: string | null; avatarColor: string },
): Promise<void> {
  const { error } = await supabase
    .from("players")
    .update({
      display_name: fields.displayName,
      avatar_id: fields.avatarId,
      avatar_color: fields.avatarColor,
    })
    .eq("id", userId);

  if (error) throw error;
}

export async function loadFriendships(): Promise<FriendshipRow[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(FRIENDSHIP_COLUMNS)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as FriendshipRow[];
}

export async function loadPlayers(ids: string[]): Promise<PlayerRow[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("players")
    .select(PLAYER_COLUMNS)
    .in("id", ids);

  if (error) throw error;
  return (data ?? []) as PlayerRow[];
}

export async function loadHeadToHeadRecords(): Promise<HeadToHeadRecord[]> {
  const { data, error } = await supabase.rpc("get_head_to_head_records");
  if (error) throw error;
  return (data ?? []) as HeadToHeadRecord[];
}

export async function loadPendingMatchInvites(userId: string): Promise<MatchRow[]> {
  const { data, error } = await supabase
    .from("matches")
    .select(MATCH_COLUMNS)
    .eq("guest_id", userId)
    .eq("status", "invited")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MatchRow[];
}

/**
 * Always resolves successfully, whether or not the address is registered — the
 * RPC deliberately gives no signal, so accounts cannot be probed by email.
 */
export async function sendFriendRequestByEmail(email: string): Promise<void> {
  const { error } = await supabase.rpc("send_friend_request", {
    target_email: email.trim(),
  });
  if (error) throw error;
}

export async function sendFriendRequestByCode(code: string): Promise<void> {
  const { error } = await supabase.rpc("send_friend_request_by_code", {
    code: code.replace(/[\s-]/g, "").toUpperCase(),
  });
  if (error) throw error;
}

export async function respondToFriendRequest(
  requestId: string,
  accept: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("respond_to_friend_request", {
    request_id: requestId,
    accept,
  });
  if (error) throw error;
}

export async function removeFriend(friendshipId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_friend", {
    friendship_id: friendshipId,
  });
  if (error) throw error;
}
