"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type PurchaseActionState = Readonly<{
  success?: string;
  error?: string;
}>;
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(text(f, k));
const refresh = () => revalidatePath("/admin/purchases");
const friendly = (m: string) =>
  m.replace(/^.*?: /, "") || "The purchase order operation failed.";
export async function createPurchaseOrder(
  _: PurchaseActionState,
  f: FormData,
): Promise<PurchaseActionState> {
  const s = text(f, "supplierId");
  if (!s) return { error: "Select an active supplier." };
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("admin_create_purchase_order", {
    p_supplier_id: s,
    p_is_emergency: f.get("isEmergency") === "on",
  });
  if (error) return { error: friendly(error.message) };
  refresh();
  return { success: `Draft purchase order created (${data}).` };
}
export async function savePurchaseLine(
  _: PurchaseActionState,
  f: FormData,
): Promise<PurchaseActionState> {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_save_purchase_order_line", {
    p_order_id: text(f, "orderId"),
    p_variant_id: text(f, "variantId"),
    p_order_unit: text(f, "orderUnit"),
    p_quantity: num(f, "quantity"),
    p_unit_cost: num(f, "unitCost"),
    p_discount_type: text(f, "discountType") || null,
    p_discount_value: num(f, "discountValue") || 0,
  });
  if (error) return { error: friendly(error.message) };
  refresh();
  return { success: "Purchase line saved." };
}
export async function setPurchaseDiscount(
  _: PurchaseActionState,
  f: FormData,
): Promise<PurchaseActionState> {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_set_purchase_order_discount", {
    p_order_id: text(f, "orderId"),
    p_discount_type: text(f, "discountType") || null,
    p_discount_value: num(f, "discountValue") || 0,
  });
  if (error) return { error: friendly(error.message) };
  refresh();
  return { success: "Order discount saved." };
}
export async function transitionPurchaseOrder(f: FormData) {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_transition_purchase_order", {
    p_order_id: text(f, "orderId"),
    p_to_state: text(f, "toState"),
    p_reason: text(f, "reason") || null,
  });
  if (error) throw new Error(friendly(error.message));
  refresh();
}
export async function amendPurchaseOrder(f: FormData) {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_amend_purchase_order", {
    p_order_id: text(f, "orderId"),
    p_reason: text(f, "reason"),
  });
  if (error) throw new Error(friendly(error.message));
  refresh();
}
export async function cancelPurchaseOrder(f: FormData) {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_cancel_purchase_order", {
    p_order_id: text(f, "orderId"),
    p_reason: text(f, "reason"),
  });
  if (error) throw new Error(friendly(error.message));
  refresh();
}
