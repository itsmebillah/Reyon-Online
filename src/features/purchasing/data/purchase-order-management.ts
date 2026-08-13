import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PurchaseRelationship = Readonly<{
  id: string;
  supplierId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  supplierSku: string;
  moq: number;
  packSize: number;
  cost: number;
  leadTimeDays: number;
  isPreferred: boolean;
}>;
export type PurchaseOrder = Readonly<{
  id: string;
  reference: string;
  supplierId: string;
  supplierName: string;
  status: string;
  currency: "BDT";
  isEmergency: boolean;
  amendmentNumber: number;
  createdAt: string;
  updatedAt: string;
  totals: {
    subtotal: number;
    lineDiscount: number;
    orderDiscount: number;
    total: number;
  };
  lines: readonly Readonly<{
    id: string;
    variantId: string;
    sku: string;
    productName: string;
    variantLabel: string;
    quantity: number;
    unitCost: number;
    orderUnit: "unit" | "pack";
    packSize: number;
    packCount: number | null;
    discountType: string | null;
    discountValue: number;
    lineTotal: number;
  }>[];
  history: readonly Readonly<{
    sequence: number;
    fromState: string | null;
    toState: string;
    reason: string | null;
    actorRole: string | null;
    occurredAt: string;
  }>[];
}>;
export async function getPurchaseOrderRegister() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_purchase_order_register");
  if (error || !data) throw new Error("Unable to load purchase orders.");
  return data as Readonly<{
    suppliers: readonly { id: string; name: string; code: string }[];
    orders: readonly PurchaseOrder[];
    relationships: readonly PurchaseRelationship[];
  }>;
}
