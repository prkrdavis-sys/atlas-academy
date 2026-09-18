import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/cloud-availability";

let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (!browserClient) {
    const { url, key } = getSupabasePublicConfig();
    browserClient = createBrowserClient(url, key);
  }

  return browserClient;
}
