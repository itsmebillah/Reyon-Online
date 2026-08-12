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

export async function configureDeliveryPartner(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_configure_delivery_partner", {
    p_partner_key: String(form.get("partnerKey") ?? ""),
    p_display_name: String(form.get("displayName") ?? ""),
    p_is_active: form.get("isActive") === "on",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/delivery");
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
