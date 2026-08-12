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

export async function applyOrderDiscount(
  _state: OrderActionState,
  form: FormData,
): Promise<OrderActionState> {
  const orderId = String(form.get("orderId") ?? "");
  const lineId = String(form.get("orderLineId") ?? "").trim() || null;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_apply_order_discount", {
    p_order_id: orderId,
    p_scope: String(form.get("scope") ?? ""),
    p_order_line_id: lineId,
    p_discount_type: String(form.get("discountType") ?? ""),
    p_discount_value: Number(form.get("discountValue")),
    p_reason: String(form.get("reason") ?? ""),
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  return { success: "Discount applied with append-only audit evidence." };
}
