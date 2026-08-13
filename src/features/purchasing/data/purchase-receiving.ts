import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type ReceivingOrder = Readonly<{
  id: string;
  reference: string;
  supplierName: string;
  status: string;
  lines: readonly Readonly<{
    id: string;
    productName: string;
    variantLabel: string;
    sku: string;
    orderedQuantity: number;
    receivedQuantity: number;
  }>[];
}>;
export type PurchaseReceipt = Readonly<{
  id: string;
  receiptReference: string;
  poReference: string;
  supplierName: string;
  supplierDeliveryReference: string | null;
  evidenceReference: string | null;
  receivedAt: string;
  actorRole: string;
  productName: string;
  variantLabel: string;
  accepted: number;
  damagedRejected: number;
  quarantined: number;
  short: number;
  excess: number;
  batchCode: string | null;
  expiresOn: string | null;
  movementId: string | null;
}>;
export async function getPurchaseReceivingQueue() {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("admin_purchase_receiving_queue");
  if (error || !data) throw new Error("Unable to load purchase receiving.");
  return data as Readonly<{
    orders: readonly ReceivingOrder[];
    receipts: readonly PurchaseReceipt[];
  }>;
}
