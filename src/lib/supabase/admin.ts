import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/config/supabase";

export function createSupabaseAdminClient() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret)
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required on the server for employee account administration.",
    );
  return createClient(getSupabasePublicConfig().url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
