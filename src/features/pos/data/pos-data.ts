import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PosProduct, PosReceipt, PosShift } from "@/features/pos/types";

async function rpc<T>(name: string, parameters: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(name, parameters);
  if (error) throw new Error(error.message);
  return data as T;
}

export const getPosCatalog = (locationId: string, query?: string) =>
  rpc<PosProduct[]>("pos_catalog", {
    p_location_id: locationId,
    p_query: query ?? null,
  });

export const getPosShifts = (locationId: string) =>
  rpc<PosShift[]>("pos_shift_history", { p_location_id: locationId });

export const getPosSales = (locationId: string, query?: string) =>
  rpc<readonly Record<string, unknown>[]>("pos_sales", {
    p_location_id: locationId,
    p_query: query ?? null,
  });

export const getPosDashboard = (
  locationId: string,
  from?: string,
  to?: string,
) =>
  rpc<Record<string, unknown>>("pos_dashboard", {
    p_location_id: locationId,
    p_from: from || null,
    p_to: to || null,
  });

export const getPosCustomers = (locationId: string, query?: string) =>
  rpc<readonly Record<string, unknown>[]>("pos_customers", {
    p_location_id: locationId,
    p_query: query ?? null,
  });

export const getPosReceipt = (orderId: string) =>
  rpc<PosReceipt | null>("pos_receipt", { p_order_id: orderId });

export const getPosSettings = (locationId: string) =>
  rpc<Record<string, string | number | null>>("pos_settings", {
    p_location_id: locationId,
  });

export const getPosStaff = (locationId: string) =>
  rpc<readonly Record<string, unknown>[]>("pos_staff", {
    p_location_id: locationId,
  });
