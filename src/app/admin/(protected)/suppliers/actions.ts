"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupplierActionState = Readonly<{
  success?: string;
  error?: string;
}>;
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const number = (form: FormData, key: string) => Number(text(form, key));
const refresh = () => revalidatePath("/admin/suppliers");
const message = (value: string) =>
  value.replace(/^.*?: /, "") ||
  "The supplier operation could not be completed.";

export async function createSupplier(
  _: SupplierActionState,
  form: FormData,
): Promise<SupplierActionState> {
  const code = text(form, "code"),
    name = text(form, "displayName");
  if (!code || !name)
    return { error: "Supplier code and display name are required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_create_supplier", {
    p_code: code,
    p_display_name: name,
    p_legal_name: text(form, "legalName") || null,
  });
  if (error) return { error: message(error.message) };
  refresh();
  return { success: `${name} was created as Draft.` };
}
export async function transitionSupplier(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_transition_supplier", {
    p_supplier_id: text(form, "supplierId"),
    p_to_state: text(form, "toState"),
    p_reason: text(form, "reason") || null,
  });
  if (error) throw new Error(message(error.message));
  refresh();
}
export async function saveSupplierVariant(
  _: SupplierActionState,
  form: FormData,
): Promise<SupplierActionState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_upsert_supplier_variant", {
    p_supplier_id: text(form, "supplierId"),
    p_variant_id: text(form, "variantId"),
    p_supplier_sku: text(form, "supplierSku"),
    p_moq: number(form, "moq"),
    p_pack_size: number(form, "packSize"),
    p_purchase_cost: number(form, "purchaseCost"),
    p_lead_time_days: number(form, "leadTimeDays"),
    p_is_preferred: form.get("isPreferred") === "on",
    p_is_active: form.get("isActive") === "on",
  });
  if (error) return { error: message(error.message) };
  refresh();
  return { success: "Supplier sourcing terms were saved." };
}
