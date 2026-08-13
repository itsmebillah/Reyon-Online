"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type PurchaseReturnState = Readonly<{
  success?: string;
  error?: string;
}>;
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const refresh = () => {
  revalidatePath("/admin/purchases/returns");
  revalidatePath("/admin/inventory");
};
export async function requestPurchaseReturn(
  _: PurchaseReturnState,
  f: FormData,
): Promise<PurchaseReturnState> {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_request_purchase_return", {
    p_receipt_line_id: text(f, "receiptLineId"),
    p_quantity: Number(text(f, "quantity")),
    p_reason: text(f, "reason"),
    p_note: text(f, "note"),
  });
  if (error) return { error: error.message.replace(/^.*?: /, "") };
  refresh();
  return { success: "Purchase return requested." };
}
export async function transitionPurchaseReturn(f: FormData) {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_transition_purchase_return", {
    p_return_id: text(f, "returnId"),
    p_target: text(f, "target"),
    p_note: text(f, "note") || null,
    p_evidence_reference: text(f, "evidenceReference") || null,
  });
  if (error) throw new Error(error.message);
  refresh();
}
