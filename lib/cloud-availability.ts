/**
 * Accounts, friends, versus, cloud sync, and the global daily board.
 * Off by default while Supabase is down. After restore, set
 * NEXT_PUBLIC_CLOUD_ENABLED=1 and redeploy.
 */
export function isCloudEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CLOUD_ENABLED === "1";
}

const DISABLED_SUPABASE_URL = "https://cloud-disabled.invalid";
const DISABLED_SUPABASE_KEY =
  "eyJhbGciOiJub25lIn0.eyJpc3MiOiJjbG91ZC1kaXNhYmxlZCJ9.dummy";

export function getSupabasePublicConfig(): { url: string; key: string } {
  if (isCloudEnabled()) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) return { url, key };
  }
  return { url: DISABLED_SUPABASE_URL, key: DISABLED_SUPABASE_KEY };
}
