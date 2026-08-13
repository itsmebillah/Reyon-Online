"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function closePurchaseOrder(form: FormData) {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_close_purchase_order", {
    p_order_id: String(form.get("poId") ?? ""),
    p_note: String(form.get("note") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/purchases/performance");
  revalidatePath("/admin/purchases");
}
