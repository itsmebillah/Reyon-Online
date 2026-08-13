"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AccountingActionState = Readonly<{
  error?: string;
  success?: string;
}>;

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

async function call(
  rpc: string,
  params: Record<string, unknown>,
  success: string,
): Promise<AccountingActionState> {
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc(rpc, params);
  if (error) return { error: error.message };
  revalidatePath("/admin/accounts");
  return { success };
}

export async function saveProfile(
  _state: AccountingActionState,
  form: FormData,
) {
  return call(
    "admin_save_accounting_profile",
    {
      p_legal_name: text(form, "legalName"),
      p_legal_type: text(form, "legalType"),
      p_fiscal_month: Number(form.get("fiscalMonth")),
      p_reason: text(form, "reason"),
    },
    "Legal and fiscal configuration saved. Posting remains disabled.",
  );
}

export async function assignApprover(
  _state: AccountingActionState,
  form: FormData,
) {
  return call(
    "admin_assign_finance_approver",
    {
      p_user_id: text(form, "userId"),
      p_reason: text(form, "reason"),
    },
    "Finance approver assigned.",
  );
}

export async function saveLedgerAccount(
  _state: AccountingActionState,
  form: FormData,
) {
  return call(
    "admin_save_ledger_account",
    {
      p_code: text(form, "code"),
      p_name: text(form, "name"),
      p_class: text(form, "accountClass"),
      p_group: text(form, "accountGroup"),
      p_normal_balance: text(form, "normalBalance"),
      p_reason: text(form, "reason"),
    },
    "Chart account approved and saved.",
  );
}

export async function saveFinancialAccount(
  _state: AccountingActionState,
  form: FormData,
) {
  return call(
    "admin_save_financial_account",
    {
      p_kind: text(form, "kind"),
      p_name: text(form, "name"),
      p_ledger_account_id: text(form, "ledgerAccountId"),
      p_provider: text(form, "provider"),
      p_masked_reference: text(form, "maskedReference"),
      p_reason: text(form, "reason"),
    },
    "Financial account saved. No opening value was assumed.",
  );
}

export async function saveOpeningBalances(
  _state: AccountingActionState,
  form: FormData,
) {
  const lines = JSON.parse(text(form, "lines") || "[]") as unknown;
  return call(
    "admin_save_opening_balances",
    {
      p_effective_date: text(form, "effectiveDate"),
      p_evidence_reference: text(form, "evidenceReference"),
      p_lines: lines,
      p_reason: text(form, "reason"),
    },
    "Balanced opening evidence saved. Explicit activation is still required.",
  );
}

export async function activateConfiguration(
  _state: AccountingActionState,
  form: FormData,
) {
  return call(
    "admin_activate_accounting_configuration",
    { p_reason: text(form, "reason") },
    "Accounting configuration activated. Posting controls are now enabled.",
  );
}

export async function savePostingMapping(
  _state: AccountingActionState,
  form: FormData,
) {
  return call(
    "admin_save_posting_account_mapping",
    {
      p_purpose: text(form, "purpose"),
      p_ledger_account_id: text(form, "ledgerAccountId"),
      p_reason: text(form, "reason"),
    },
    "Posting account mapping saved. Reactivation is required.",
  );
}
