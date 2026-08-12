"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type CancellationState = { success?: string; error?: string };
export async function requestCancellation(
  _state: CancellationState,
  form: FormData,
): Promise<CancellationState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("request_order_cancellation", {
    p_order_reference: String(form.get("orderReference") ?? ""),
    p_phone: String(form.get("phone") ?? ""),
    p_reason: String(form.get("reason") ?? ""),
  });
  return error
    ? { error: error.message }
    : { success: "Cancellation request received for administrator review." };
}
