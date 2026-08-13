import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type DeliveryZone = {
  id: string;
  key: string;
  name: string;
  charge: number | null;
  currency: string;
  isEnabled: boolean;
  displayOrder: number;
};
export async function getDeliveryZones(): Promise<readonly DeliveryZone[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_delivery_zones");
  if (error || !data) throw new Error("Unable to load delivery configuration.");
  return data as DeliveryZone[];
}

export type DeliveryOperations = {
  partners: { id: string; key: string; name: string; isActive: boolean }[];
  shipments: {
    id: string;
    orderId: string;
    orderNumber: string;
    state: string;
    partner: string | null;
    handler: string | null;
    reference: string | null;
    createdAt: string;
    attemptCount: number;
    paymentKind: string;
    expectedAmount: number;
    codMismatch: boolean;
  }[];
};
export async function getDeliveryOperations(): Promise<DeliveryOperations> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_delivery_operations");
  if (error || !data) throw new Error("Unable to load delivery operations.");
  return data as DeliveryOperations;
}
