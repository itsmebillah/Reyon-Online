"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupplierPaymentActionState = Readonly<{
  success?: string;
  error?: string;
}>;
const value = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const refresh = () => revalidatePath("/admin/purchases/payments");
const message = (error: { message: string }) =>
  error.message.replace(/^.*?: /, "");

export async function recordSupplierPayment(
  _: SupplierPaymentActionState,
  form: FormData,
): Promise<SupplierPaymentActionState> {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_record_supplier_payment", {
    p_order_id: value(form, "poId"),
    p_amount: Number(value(form, "amount")),
    p_payment_date: value(form, "paymentDate"),
    p_method: value(form, "method"),
    p_provider_reference: value(form, "providerReference"),
    p_evidence_reference: value(form, "evidenceReference"),
    p_note: value(form, "note") || null,
  });
  if (error) return { error: message(error) };
  refresh();
  return { success: "Supplier payment submitted for verification." };
}
export async function decideSupplierPayment(form: FormData) {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_verify_supplier_payment", {
    p_payment_id: value(form, "paymentId"),
    p_target: value(form, "target"),
    p_reason: value(form, "reason") || null,
  });
  if (error) throw new Error(error.message);
  refresh();
}
export async function setPurchaseCreditTerms(form: FormData) {
  const db = await createSupabaseServerClient();
  const isCredit = value(form, "isCredit") === "true";
  const { error } = await db.rpc("admin_set_purchase_credit_terms", {
    p_order_id: value(form, "poId"),
    p_is_credit: isCredit,
    p_due_on: isCredit ? value(form, "dueOn") : null,
    p_reason: value(form, "reason"),
  });
  if (error) throw new Error(error.message);
  refresh();
}
export async function setPurchasePayableDispute(form: FormData) {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_set_purchase_payable_dispute", {
    p_order_id: value(form, "poId"),
    p_disputed: value(form, "disputed") === "true",
    p_reason: value(form, "reason"),
  });
  if (error) throw new Error(error.message);
  refresh();
}
