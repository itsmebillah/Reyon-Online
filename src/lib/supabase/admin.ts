import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/config/supabase";

export function createSupabaseAdminClient() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const { url, publishableKey } = getSupabasePublicConfig();
  if (!secret)
    throw new Error("Employee account administration is not configured.");
  if (secret === publishableKey || secret.startsWith("sb_publishable_"))
    throw new Error(
      "Employee account administration has an invalid server credential.",
    );
  return createClient(url, secret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
