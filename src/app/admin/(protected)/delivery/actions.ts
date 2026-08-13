"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function updateDeliveryZone(form: FormData) {
  const charge = String(form.get("charge") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_delivery_zone", {
    p_zone_id: String(form.get("zoneId")),
    p_name: String(form.get("name") ?? "").trim(),
    p_charge: charge === "" ? null : Number(charge),
    p_is_enabled: form.get("isEnabled") === "on",
    p_display_order: Number(form.get("displayOrder") ?? 0),
  });
  if (error)
    throw new Error(
      "Delivery zone could not be saved. Set a valid charge before enabling it.",
    );
  revalidatePath("/admin/delivery");
  revalidatePath("/checkout");
}

export type DeliveryPartnerState = Readonly<{
  error?: string;
  success?: string;
}>;
export async function configureDeliveryPartner(
  _state: DeliveryPartnerState,
  form: FormData,
): Promise<DeliveryPartnerState> {
  const partnerKey = String(form.get("partnerKey") ?? "").trim();
  const displayName = String(form.get("displayName") ?? "").trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(partnerKey))
    return {
      error:
        "Partner key must use lowercase letters, numbers, and single hyphens only.",
    };
  if (!displayName) return { error: "Display name is required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_configure_delivery_partner", {
    p_partner_key: partnerKey,
    p_display_name: displayName,
    p_is_active: form.get("isActive") === "on",
  });
  if (error) return { error: error.message };
  revalidatePath("/admin/delivery");
  return { success: "Delivery partner saved." };
}

export async function assignShipment(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_assign_shipment", {
    p_fulfillment_id: String(form.get("fulfillmentId") ?? ""),
    p_handler_name: String(form.get("handlerName") ?? ""),
    p_shipment_reference: String(form.get("shipmentReference") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/delivery");
}

export async function transitionDelivery(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_transition_delivery", {
    p_fulfillment_id: String(form.get("fulfillmentId") ?? ""),
    p_target_state: String(form.get("targetState") ?? ""),
    p_note: String(form.get("note") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/delivery");
  revalidatePath("/admin/orders");
}

export async function recordDeliveryAttempt(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_record_delivery_attempt", {
    p_fulfillment_id: String(form.get("fulfillmentId") ?? ""),
    p_result: String(form.get("result") ?? ""),
    p_reason: String(form.get("reason") ?? ""),
    p_note: String(form.get("note") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/delivery");
}

export async function completeDelivery(form: FormData) {
  const amount = String(form.get("collectedAmount") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_complete_delivery", {
    p_fulfillment_id: String(form.get("fulfillmentId") ?? ""),
    p_receiver_name: String(form.get("receiverName") ?? ""),
    p_responsible_identity: String(form.get("responsibleIdentity") ?? ""),
    p_confirmation_note: String(form.get("confirmationNote") ?? ""),
    p_collected_amount: amount ? Number(amount) : null,
    p_cod_mismatch_reason:
      String(form.get("codMismatchReason") ?? "").trim() || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/delivery");
  revalidatePath("/admin/orders");
}

export async function recordDeliveryException(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_record_delivery_exception", {
    p_fulfillment_id: String(form.get("fulfillmentId") ?? ""),
    p_exception_state: String(form.get("exceptionState") ?? ""),
    p_reason: String(form.get("reason") ?? ""),
    p_note: String(form.get("note") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/delivery");
}

export async function reconcileCod(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_reconcile_cod", {
    p_fulfillment_id: String(form.get("fulfillmentId") ?? ""),
    p_collected_amount: Number(form.get("collectedAmount")),
    p_reason: String(form.get("reason") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/delivery");
  revalidatePath("/admin/orders");
}
