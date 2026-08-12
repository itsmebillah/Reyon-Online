import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminOrder = Readonly<{
  id: string;
  orderNumber: string;
  state: string;
  occurredAt: string;
  updatedAt: string;
  customerName: string;
  phone: string;
  total: number;
  currency: "BDT";
  paymentMethod: string;
  paymentState: string;
  deliveryZone: string;
  lineCount: number;
  reservationExpiresAt: string | null;
}>;

export type OrderStateOption = Readonly<{
  key: string;
  name: string;
  kind: "standard" | "exception" | "terminal";
}>;

export async function getOrderManagementDashboard(filters?: {
  query?: string;
  state?: string;
}) {
  const supabase = await createSupabaseServerClient();
  const [{ data: orders, error }, { data: states, error: statesError }] =
    await Promise.all([
      supabase.rpc("admin_orders", {
        p_query: filters?.query || null,
        p_state: filters?.state || null,
      }),
      supabase.rpc("admin_order_states"),
    ]);
  if (error || statesError)
    throw new Error("Order Management could not be loaded.");
  return {
    orders: (orders ?? []) as AdminOrder[],
    states: (states ?? []) as OrderStateOption[],
  };
}

export async function getOrderDetail(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_order_detail", {
    p_order_id: id,
  });
  if (error || !data) throw new Error("Order details could not be loaded.");
  return data as unknown as {
    id: string;
    orderNumber: string;
    state: string;
    occurredAt: string;
    subtotal: number;
    deliveryAmount: number;
    total: number;
    currency: "BDT";
    address: {
      full_name: string;
      phone: string;
      house_no: string;
      road: string;
      village_city: string;
      district: string;
      division: string;
    };
    delivery: { zone_name_snapshot: string; charge_amount: number };
    payment: {
      method_name_snapshot: string;
      evidence_state_key: string;
      transaction_reference: string | null;
    };
    lines: {
      id: string;
      product_name_snapshot: string;
      variant_label_snapshot: string;
      sku_snapshot: string;
      quantity: number;
      unit_price_amount: number;
    }[];
    history: {
      sequence: number;
      from: string | null;
      to: string;
      occurredAt: string;
      reason: string | null;
    }[];
    allowedTransitions: {
      key: string;
      name: string;
      requiresReason: boolean;
      requiresHandoff: boolean;
    }[];
  };
}
