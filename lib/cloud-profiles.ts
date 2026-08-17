import type { Profile, ProfileAvatarId } from "@/lib/types";
import { mergeProfileProgress } from "@/lib/profile-merge";
import { createClient } from "@/lib/supabase/client";
import { normalizeProfile } from "@/lib/storage";

export type CloudProfileRow = {
  id: string;
  user_id: string;
  name: string;
  avatar_color: string;
  avatar_id: string | null;
  profile_data: unknown;
  created_at: string;
  updated_at: string;
};

const supabase = createClient();
const PROFILE_COLUMNS = "id,user_id,name,avatar_color,avatar_id,profile_data,created_at,updated_at";
const FALLBACK_CLOUD_ERROR = "Cloud sync failed. Your local cache is still available.";

function toCloudProfileRow(userId: string, profile: Profile) {
  return {
    id: profile.id,
    user_id: userId,
    name: profile.name,
    avatar_color: profile.avatarColor,
    avatar_id: profile.avatarId ?? null,
    profile_data: profile,
    created_at: profile.createdAt,
  };
}

/** Normalize Postgrest/Supabase non-Error throws into a real Error. */
export function toCloudError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return new Error(message);
    }
  }
  if (typeof error === "string" && error.trim()) {
    return new Error(error);
  }
  return new Error(FALLBACK_CLOUD_ERROR);
}

function throwCloudError(error: unknown): never {
  throw toCloudError(error);
}

export function normalizeCloudProfile(row: CloudProfileRow): Profile | null {
  try {
    if (!row.profile_data || typeof row.profile_data !== "object") return null;
    const rawProfile = row.profile_data as Partial<Profile>;
    const profile = {
      ...rawProfile,
      id: row.id,
      name: row.name,
      avatarColor: row.avatar_color,
      avatarId: row.avatar_id ? (row.avatar_id as ProfileAvatarId) : undefined,
      createdAt: rawProfile.createdAt ?? row.created_at,
    } as Profile;
    return normalizeProfile(profile);
  } catch {
    return null;
  }
}

async function selectCloudProfiles(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throwCloudError(error);
  return (data ?? []) as unknown as CloudProfileRow[];
}

export async function loadCloudProfiles(userId: string) {
  const rows = await selectCloudProfiles(userId);
  if (rows.length > 0) return rows;

  // An empty read can be RLS seeing no session yet. Confirm auth and retry
  // before callers treat the account as having no cloud profiles.
  const { data, error } = await supabase.auth.getSession();
  if (error) throwCloudError(error);
  if (data.session?.user?.id !== userId) {
    throwCloudError(new Error("Not signed in."));
  }
  return selectCloudProfiles(userId);
}

export async function saveCloudProfile(userId: string, profile: Profile) {
  const { data, error: readError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .eq("id", profile.id)
    .maybeSingle();

  if (readError) throwCloudError(readError);

  const remote = data ? normalizeCloudProfile(data as unknown as CloudProfileRow) : null;
  const merged = remote ? mergeProfileProgress(profile, remote) : profile;
  const { error } = await supabase
    .from("profiles")
    .upsert(toCloudProfileRow(userId, merged), { onConflict: "id" });

  if (error) throwCloudError(error);
}

export async function saveCloudProfiles(userId: string, profiles: Profile[]) {
  if (profiles.length === 0) return;

  const { error } = await supabase
    .from("profiles")
    .upsert(profiles.map((profile) => toCloudProfileRow(userId, profile)), { onConflict: "id" });

  if (error) throwCloudError(error);
}

export async function deleteCloudProfile(userId: string, profileId: string) {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("user_id", userId)
    .eq("id", profileId);

  if (error) throwCloudError(error);
}
