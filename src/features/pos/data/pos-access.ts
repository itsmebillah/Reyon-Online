import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PosContext } from "@/features/pos/types";

export async function requirePosAccess(): Promise<PosContext> {
  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub)
    redirect("/admin/login?next=/pos");
  const { data, error } = await supabase.rpc("pos_context");
  const context = data as PosContext | null;
  if (error || !context || !context.capabilities.includes("pos.access"))
    redirect("/admin/access-denied");
  return context;
}

export async function getSelectedPosLocation(context: PosContext) {
  const store = await cookies();
  const selectedId = store.get("reyon-pos-location")?.value;
  return (
    context.locations.find((location) => location.id === selectedId) ??
    context.locations[0]
  );
}
