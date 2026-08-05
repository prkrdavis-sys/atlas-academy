import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

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

export async function loadCloudProfiles(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as CloudProfileRow[];
}

export async function saveCloudProfile(userId: string, profile: Profile) {
  const { error } = await supabase
    .from("profiles")
    .upsert(toCloudProfileRow(userId, profile), { onConflict: "id" });

  if (error) throw error;
}

export async function saveCloudProfiles(userId: string, profiles: Profile[]) {
  if (profiles.length === 0) return;

  const { error } = await supabase
    .from("profiles")
    .upsert(profiles.map((profile) => toCloudProfileRow(userId, profile)), { onConflict: "id" });

  if (error) throw error;
}

export async function deleteCloudProfile(userId: string, profileId: string) {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("user_id", userId)
    .eq("id", profileId);

  if (error) throw error;
}
