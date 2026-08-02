import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requireReyonAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || !claims?.sub) redirect("/admin/login");

  const { data: isAdmin, error: authorizationError } =
    await supabase.rpc("is_reyon_admin");
  if (authorizationError || !isAdmin) redirect("/admin/access-denied");

  return { userId: claims.sub, email: claims.email } as const;
}
