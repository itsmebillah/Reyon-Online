"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function resolveReview(form: FormData) {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("admin_resolve_order_review", {
    p_case_id: String(form.get("caseId")),
    p_resolution: String(form.get("resolution")),
    p_note: String(form.get("note")),
  });
  revalidatePath("/admin/orders/reviews");
}
export async function processExpiredReservations() {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("admin_process_expired_reservations");
  revalidatePath("/admin/orders/reviews");
  revalidatePath("/admin/orders");
}
