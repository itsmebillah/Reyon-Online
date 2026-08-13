import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type SupplierPerformanceOverview = Readonly<{
  closeableOrders: readonly Readonly<{
    id: string;
    reference: string;
    supplierName: string;
    eligiblePayable: number;
    paidAmount: number;
  }>[];
  suppliers: readonly Readonly<{
    id: string;
    name: string;
    status: string;
    poCount: number;
    closedCount: number;
    receiptCount: number;
    discrepancyCount: number;
    returnCount: number;
    verifiedPaid: number;
    outstanding: number;
  }>[];
  replenishment: readonly Readonly<{
    variantId: string;
    productName: string;
    variantLabel: string;
    sku: string;
    onHand: number;
    supplierName: string;
    moq: number;
    packSize: number;
    purchaseCost: number;
    leadTimeDays: number;
  }>[];
}>;
export async function getSupplierPerformanceOverview() {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("admin_supplier_performance_overview");
  if (error || !data) throw new Error("Unable to load purchase closeout.");
  return data as SupplierPerformanceOverview;
}
