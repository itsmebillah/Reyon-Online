import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type EligiblePurchaseReturn = Readonly<{
  receiptLineId: string;
  receiptReference: string;
  poReference: string;
  supplierName: string;
  productName: string;
  variantLabel: string;
  batchCode: string | null;
  expiresOn: string | null;
  acceptedQuantity: number;
  returnedQuantity: number;
}>;
export type ManagedPurchaseReturn = Readonly<{
  id: string;
  reference: string;
  status: string;
  reason: string;
  note: string;
  quantity: number;
  receiptReference: string;
  poReference: string;
  supplierName: string;
  productName: string;
  variantLabel: string;
  batchCode: string | null;
  expiresOn: string | null;
  evidenceReference: string | null;
  movementId: string | null;
  history: readonly Readonly<{
    sequence: number;
    fromState: string | null;
    toState: string;
    note: string | null;
    actorRole: string;
    occurredAt: string;
  }>[];
}>;
export async function getPurchaseReturnQueue() {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("admin_purchase_return_queue");
  if (error || !data) throw new Error("Unable to load purchase returns.");
  return data as Readonly<{
    eligible: readonly EligiblePurchaseReturn[];
    returns: readonly ManagedPurchaseReturn[];
  }>;
}
