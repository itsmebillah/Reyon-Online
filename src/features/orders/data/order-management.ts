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
