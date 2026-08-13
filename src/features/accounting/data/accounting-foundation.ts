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
  postingMappings: readonly Readonly<{
    purpose: string;
    ledgerAccountId: string;
    accountCode: string;
    accountName: string;
  }>[];
}>;

export type CompletedSaleJournal = Readonly<{
  id: string;
  reference: string;
  postingDate: string;
  sourceModule: string;
  sourceReference: string;
  totalDebit: number;
  totalCredit: number;
  postingSource: string;
  description: string;
  lines: readonly Readonly<{
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    memo: string;
  }>[];
}>;
export type CogsPostingStatus = Readonly<{
  postings: readonly Readonly<{
    journalReference: string;
    sourceSaleId: string;
    orderReference: string;
    postedAt: string;
    amount: number;
    quantity: number;
    weightedAverageCost: number;
  }>[];
  exceptions: readonly Readonly<{
    sourceSaleId: string;
    key: string;
    detail: string;
    occurredAt: string;
  }>[];
}>;
export async function getAccountingFoundation() {
  const db = await createSupabaseServerClient();
  const [{ data, error }, { data: mappings, error: mappingError }] =
    await Promise.all([
      db.rpc("admin_accounting_foundation"),
      db.rpc("admin_posting_account_mappings"),
    ]);
  if (error || !data || mappingError || !mappings)
    throw new Error("Unable to load accounting configuration.");
  return {
    ...(data as AccountingFoundation),
    postingMappings: mappings,
  } as AccountingFoundation;
}

export async function getCompletedSaleJournals() {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("admin_completed_sale_journals");
  if (error || !data)
    throw new Error("Unable to load completed-sale journals.");
  return data as readonly CompletedSaleJournal[];
}

export async function getCogsPostingStatus() {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("admin_cogs_postings");
  if (error || !data) throw new Error("Unable to load COGS posting status.");
  return data as CogsPostingStatus;
}
