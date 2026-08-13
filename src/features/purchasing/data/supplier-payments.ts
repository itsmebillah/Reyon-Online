import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupplierPayable = Readonly<{
  poId: string;
  poReference: string;
  supplierName: string;
  poTotal: number;
  eligiblePayable: number;
  paidAmount: number;
  pendingAmount: number;
  outstandingAmount: number;
  status: string;
  isCreditPurchase: boolean;
  dueOn: string | null;
  isDisputed: boolean;
}>;
export type SupplierPayment = Readonly<{
  id: string;
  paymentReference: string;
  supplierName: string;
  poReference: string;
  amount: number;
  currency: string;
  paymentDate: string;
  method: string;
  providerReference: string;
  evidenceReference: string;
  note: string | null;
  recordedByRole: string;
  recordedAt: string;
  status: string;
  history: readonly Readonly<{
    sequence: number;
    fromState: string | null;
    toState: string;
    reason: string | null;
    actorRole: string;
    occurredAt: string;
  }>[];
}>;
export async function getSupplierPaymentQueue() {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("admin_supplier_payment_queue");
  if (error || !data) throw new Error("Unable to load supplier payments.");
  return data as Readonly<{
    payables: readonly SupplierPayable[];
    payments: readonly SupplierPayment[];
  }>;
}
