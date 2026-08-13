"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type ReceivingState = Readonly<{ success?: string; error?: string }>;
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(text(f, k) || "0");
export async function receivePurchaseLine(
  _: ReceivingState,
  f: FormData,
): Promise<ReceivingState> {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_receive_purchase_line", {
    p_order_id: text(f, "orderId"),
    p_order_line_id: text(f, "orderLineId"),
    p_accepted: num(f, "accepted"),
    p_damaged_rejected: num(f, "damagedRejected"),
    p_quarantined: num(f, "quarantined"),
    p_short: num(f, "short"),
    p_supplier_delivery_reference: text(f, "supplierDeliveryReference") || null,
    p_evidence_reference: text(f, "evidenceReference") || null,
    p_batch_code: text(f, "batchCode") || null,
    p_expires_on: text(f, "expiresOn") || null,
    p_discrepancy_note: text(f, "discrepancyNote") || null,
    p_approve_excess: f.get("approveExcess") === "on",
  });
  if (error) return { error: error.message.replace(/^.*?: /, "") };
  revalidatePath("/admin/purchases");
  revalidatePath("/admin/purchases/receiving");
  revalidatePath("/admin/inventory");
  return { success: "Receipt and inspection were recorded." };
}
