import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type AccountingFoundation = Readonly<{
  profile: Readonly<{
    legalEntityName: string | null;
    legalEntityType: string | null;
    fiscalYearStartMonth: number | null;
    basis: string;
    timezone: string;
    valuationMethod: string;
    currency: string;
    isConfigured: boolean;
    postingEnabled: boolean;
    activatedAt: string | null;
  }>;
  canConfigure: boolean;
  isSuperAdmin: boolean;
  financeApprovers: readonly Readonly<{
    userId: string;
    email: string;
    authorizedAt: string;
  }>[];
  adminCandidates: readonly Readonly<{
    userId: string;
    email: string;
    role: string;
  }>[];
  periods: readonly Readonly<{
    key: string;
    startDate: string;
    endDate: string;
    status: string;
  }>[];
  accounts: readonly Readonly<{
    id: string;
    code: string;
    name: string;
    class: string | null;
    group: string | null;
    normalBalance: string | null;
    active: boolean;
    approvedAt: string | null;
  }>[];
  financialAccounts: readonly Readonly<{
    id: string;
    ledgerAccountId: string;
    kind: string;
    name: string;
    provider: string | null;
    maskedReference: string | null;
    active: boolean;
  }>[];
  openingBalance: Readonly<{
    id: string;
    effectiveDate: string;
    evidenceReference: string;
    status: string;
    debits: number;
    credits: number;
    lineCount: number;
  }> | null;
  auditEvents: readonly Readonly<{
    event: string;
    subject: string;
    reason: string;
    actorRole: string;
    occurredAt: string;
  }>[];
}>;
export async function getAccountingFoundation() {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("admin_accounting_foundation");
  if (error || !data)
    throw new Error("Unable to load accounting configuration.");
  return data as AccountingFoundation;
}
