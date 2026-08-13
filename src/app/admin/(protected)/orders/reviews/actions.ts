"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type ReviewActionState = { error?: string; success?: string };
export async function resolveReview(
  _state: ReviewActionState,
  form: FormData,
): Promise<ReviewActionState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_resolve_order_review", {
    p_case_id: String(form.get("caseId")),
    p_resolution: String(form.get("resolution")),
    p_note: String(form.get("note")),
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/orders/reviews");
  revalidatePath(`/admin/orders/${String(form.get("orderId") ?? "")}`);
  revalidatePath("/admin/orders");
  return { success: "Review resolved with append-only audit evidence." };
}
export async function processExpiredReservations(
  state: ReviewActionState,
  form: FormData,
): Promise<ReviewActionState> {
  void state;
  void form;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "admin_process_expired_reservations",
  );
  if (error) return { error: error.message };
  revalidatePath("/admin/orders/reviews");
  revalidatePath("/admin/orders");
  return {
    success: `${Number(data ?? 0)} expired reservation${Number(data ?? 0) === 1 ? "" : "s"} processed.`,
  };
}
