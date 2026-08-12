"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrderActionState = { success?: string; error?: string };
export async function transitionOrder(
  _state: OrderActionState,
  form: FormData,
): Promise<OrderActionState> {
  const orderId = String(form.get("orderId") ?? "");
  const target = String(form.get("targetState") ?? "");
  const reason = String(form.get("reason") ?? "").trim() || null;
  const handoff = String(form.get("handoffReference") ?? "").trim() || null;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_transition_order", {
    p_order_id: orderId,
    p_target_state: target,
    p_reason: reason,
    p_handoff_reference: handoff,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { success: "Order status updated with audit evidence." };
}
