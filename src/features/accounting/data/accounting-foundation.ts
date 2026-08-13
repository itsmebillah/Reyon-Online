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
  }>;
  financeApproverCount: number;
  periods: readonly Readonly<{
    key: string;
    startDate: string;
    endDate: string;
    status: string;
  }>[];
  accounts: readonly Readonly<{
    code: string;
    name: string;
    class: string | null;
    group: string | null;
    active: boolean;
  }>[];
  financialAccounts: readonly Readonly<{
    kind: string;
    name: string;
    provider: string | null;
    maskedReference: string | null;
    active: boolean;
  }>[];
}>;
export async function getAccountingFoundation() {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("admin_accounting_foundation");
  if (error || !data)
    throw new Error("Unable to load accounting configuration.");
  return data as AccountingFoundation;
}
