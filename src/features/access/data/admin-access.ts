import "server-only";
import { forbidden, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PosContext } from "@/features/pos/types";

export async function requireReyonAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || !claims?.sub) redirect("/admin/login");

  const { data: isAdmin, error: authorizationError } =
    await supabase.rpc("is_reyon_admin");
  if (authorizationError || !isAdmin) redirect("/admin/access-denied");

  const { data: contextData, error: contextError } =
    await supabase.rpc("pos_context");
  const context = contextData as PosContext | null;
  if (contextError || !context) forbidden();
  if (context.role === "staff") forbidden();

  return {
    userId: claims.sub,
    email: claims.email,
    role: context.role,
    capabilities: context.capabilities,
    locations: context.locations,
  } as const;
}
