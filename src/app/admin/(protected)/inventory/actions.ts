"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type InventoryActionState = Readonly<{
  success?: string;
  error?: string;
}>;

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

const refresh = () => {
  revalidatePath("/admin/inventory");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/search");
};

const friendly = (message: string) => {
  if (/negative stock/i.test(message))
    return "That entry would make stock negative. Review the quantity and try again.";
  if (/already corrected/i.test(message))
    return "That movement has already been corrected.";
  return "The inventory entry could not be saved. Review the details and try again.";
};

export async function recordInventoryMovement(
  _state: InventoryActionState,
  form: FormData,
): Promise<InventoryActionState> {
  const quantity = Number(text(form, "quantity"));
  if (!text(form, "variantId") || !text(form, "locationId"))
    return { error: "Choose a product variant and inventory location." };
  if (!Number.isFinite(quantity) || quantity <= 0)
    return { error: "Enter a quantity greater than zero." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_record_inventory_movement", {
    p_variant_id: text(form, "variantId"),
    p_location_id: text(form, "locationId"),
    p_movement_type: text(form, "movementType"),
    p_quantity: quantity,
    p_reason: text(form, "reason") || null,
    p_reference: text(form, "reference") || null,
  });
  if (error) return { error: friendly(error.message) };
  refresh();
  return {
    success:
      "Inventory movement recorded. Website availability is synchronized.",
  };
}

export async function reverseInventoryMovement(
  _state: InventoryActionState,
  form: FormData,
): Promise<InventoryActionState> {
  const reason = text(form, "reason");
  if (!reason) return { error: "Enter the reason for this correction." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_reverse_inventory_movement", {
    p_movement_id: text(form, "movementId"),
    p_reason: reason,
  });
  if (error) return { error: friendly(error.message) };
  refresh();
  return {
    success:
      "Correction recorded. The original movement remains in the audit history.",
  };
}
