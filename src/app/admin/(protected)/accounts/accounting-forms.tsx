"use client";

import { useActionState, useMemo, useState } from "react";
import type { AccountingFoundation } from "@/features/accounting/data/accounting-foundation";
import {
  activateConfiguration,
  assignApprover,
  saveFinancialAccount,
  saveLedgerAccount,
  saveOpeningBalances,
  savePostingMapping,
  saveProfile,
  type AccountingActionState,
} from "./actions";

function Result({ state }: { state: AccountingActionState }) {
  return (
    <>
      {state.error && (
        <p className="admin-form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="admin-form-success" role="status">
          {state.success}
        </p>
      )}
    </>
  );
}

export function ProfileForm({
  profile,
}: {
  profile: AccountingFoundation["profile"];
}) {
  const [state, action, pending] = useActionState(saveProfile, {});
  return (
    <form action={action} className="catalog-admin-form">
      <label>
        Legal entity name
        <input
          name="legalName"
          required
          defaultValue={profile.legalEntityName ?? ""}
        />
      </label>
      <label>
        Legal entity type
        <input
          name="legalType"
          required
          defaultValue={profile.legalEntityType ?? ""}
          placeholder="Enter the Finance-approved legal type"
        />
      </label>
      <label>
        Fiscal-year starting month
        <select
          name="fiscalMonth"
          required
          defaultValue={profile.fiscalYearStartMonth ?? ""}
        >
          <option value="" disabled>
            Select month
          </option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Intl.DateTimeFormat("en", { month: "long" }).format(
                new Date(2026, i, 1),
              )}
            </option>
          ))}
        </select>
      </label>
      <label>
        Change reason
        <input name="reason" required />
      </label>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Saving…" : "Save legal & fiscal profile"}
      </button>
    </form>
  );
}

export function ApproverForm({
  candidates,
}: {
  candidates: AccountingFoundation["adminCandidates"];
}) {
  const [state, action, pending] = useActionState(assignApprover, {});
  return (
    <form action={action} className="catalog-admin-form">
      <label>
        Finance approver
        <select name="userId" required defaultValue="">
          <option value="" disabled>
            Select active Admin
          </option>
          {candidates.map((c) => (
            <option key={c.userId} value={c.userId}>
              {c.email} · {c.role}
            </option>
          ))}
        </select>
      </label>
      <label>
        Assignment reason
        <input name="reason" required />
      </label>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Assigning…" : "Assign Finance approver"}
      </button>
    </form>
  );
}

export function LedgerAccountForm() {
  const [state, action, pending] = useActionState(saveLedgerAccount, {});
  return (
    <form action={action} className="catalog-admin-form accounting-inline-form">
      <label>
        Account code
        <input name="code" required />
      </label>
      <label>
        Account name
        <input name="name" required />
      </label>
      <label>
        Class
        <select name="accountClass" required defaultValue="">
          <option value="" disabled>
            Select class
          </option>
          {[
            "asset",
            "liability",
            "equity",
            "revenue",
            "contra-revenue",
            "cogs",
            "expense",
          ].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Finance-approved group
        <input name="accountGroup" required />
      </label>
      <label>
        Normal balance
        <select name="normalBalance" required defaultValue="">
          <option value="" disabled>
            Select balance
          </option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
      </label>
      <label>
        Approval reason
        <input name="reason" required />
      </label>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Saving…" : "Approve chart account"}
      </button>
    </form>
  );
}

export function FinancialAccountForm({
  accounts,
}: {
  accounts: AccountingFoundation["accounts"];
}) {
  const [state, action, pending] = useActionState(saveFinancialAccount, {});
  return (
    <form action={action} className="catalog-admin-form accounting-inline-form">
      <label>
        Account type
        <select name="kind" required defaultValue="">
          <option value="" disabled>
            Select type
          </option>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="mfs">MFS</option>
          <option value="card-clearing">Card / clearing</option>
          <option value="cod-clearing">COD clearing</option>
        </select>
      </label>
      <label>
        Display name
        <input name="name" required />
      </label>
      <label>
        Approved ledger account
        <select name="ledgerAccountId" required defaultValue="">
          <option value="" disabled>
            Select account
          </option>
          {accounts
            .filter((a) => a.active && a.approvedAt)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} · {a.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Provider
        <input
          name="provider"
          placeholder="Required except for physical cash"
        />
      </label>
      <label>
        Masked account/reference
        <input
          name="maskedReference"
          placeholder="Never enter a secret or full credential"
        />
      </label>
      <label>
        Approval reason
        <input name="reason" required />
      </label>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Saving…" : "Save financial account"}
      </button>
    </form>
  );
}

type BalanceLine = { accountId: string; debit: string; credit: string };
export function OpeningBalanceForm({
  accounts,
}: {
  accounts: AccountingFoundation["accounts"];
}) {
  const [state, action, pending] = useActionState(saveOpeningBalances, {});
  const [lines, setLines] = useState<BalanceLine[]>([
    { accountId: "", debit: "", credit: "" },
    { accountId: "", debit: "", credit: "" },
  ]);
  const totals = useMemo(
    () =>
      lines.reduce(
        (t, l) => ({
          debit: t.debit + Number(l.debit || 0),
          credit: t.credit + Number(l.credit || 0),
        }),
        { debit: 0, credit: 0 },
      ),
    [lines],
  );
  const serialized = JSON.stringify(
    lines
      .filter(
        (l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0),
      )
      .map((l) => ({
        accountId: l.accountId,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
      })),
  );
  const update = (index: number, key: keyof BalanceLine, value: string) =>
    setLines((current) =>
      current.map((line, i) =>
        i === index ? { ...line, [key]: value } : line,
      ),
    );
  return (
    <form action={action} className="catalog-admin-form">
      <label>
        Opening-balance effective date
        <input type="date" name="effectiveDate" required />
      </label>
      <label>
        Evidence reference
        <input
          name="evidenceReference"
          required
          placeholder="Document or controlled evidence reference"
        />
      </label>
      <div className="accounting-balance-lines">
        {lines.map((line, index) => (
          <fieldset key={index}>
            <legend>Line {index + 1}</legend>
            <label>
              Ledger account
              <select
                value={line.accountId}
                onChange={(e) => update(index, "accountId", e.target.value)}
                required
              >
                <option value="" disabled>
                  Select account
                </option>
                {accounts
                  .filter((a) => a.active && a.approvedAt)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} · {a.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Debit (BDT)
              <input
                type="number"
                min="0"
                step="0.01"
                value={line.debit}
                onChange={(e) => update(index, "debit", e.target.value)}
              />
            </label>
            <label>
              Credit (BDT)
              <input
                type="number"
                min="0"
                step="0.01"
                value={line.credit}
                onChange={(e) => update(index, "credit", e.target.value)}
              />
            </label>
          </fieldset>
        ))}
      </div>
      <button
        type="button"
        className="button button--secondary"
        onClick={() =>
          setLines((l) => [...l, { accountId: "", debit: "", credit: "" }])
        }
      >
        Add balance line
      </button>
      <p
        className={
          Math.abs(totals.debit - totals.credit) < 0.005 && totals.debit > 0
            ? "admin-form-success"
            : "admin-form-error"
        }
      >
        Debits: BDT {totals.debit.toFixed(2)} · Credits: BDT{" "}
        {totals.credit.toFixed(2)}
      </p>
      <input type="hidden" name="lines" value={serialized} />
      <label>
        Approval reason
        <input name="reason" required />
      </label>
      <Result state={state} />
      <button
        className="button button--primary"
        disabled={
          pending ||
          totals.debit <= 0 ||
          Math.abs(totals.debit - totals.credit) >= 0.005
        }
      >
        {pending ? "Saving…" : "Save balanced opening evidence"}
      </button>
    </form>
  );
}

export function ActivationForm() {
  const [state, action, pending] = useActionState(activateConfiguration, {});
  return (
    <form action={action} className="catalog-admin-form">
      <label>
        Activation reason
        <input name="reason" required />
      </label>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Validating…" : "Validate and activate accounting"}
      </button>
    </form>
  );
}

export function PostingMappingForm({
  accounts,
}: {
  accounts: AccountingFoundation["accounts"];
}) {
  const [state, action, pending] = useActionState(savePostingMapping, {});
  return (
    <form action={action} className="catalog-admin-form accounting-inline-form">
      <label>
        Posting purpose
        <select name="purpose" required defaultValue="">
          <option value="" disabled>
            Select purpose
          </option>
          <option value="product-sales">Product Sales</option>
          <option value="delivery-revenue">Delivery Revenue</option>
          <option value="sales-discounts">Sales Discounts</option>
          <option value="inventory">Inventory</option>
          <option value="cost-of-sales">Cost of Sales</option>
          <option value="accounts-payable">Accounts Payable</option>
        </select>
      </label>
      <label>
        Approved ledger account
        <select name="ledgerAccountId" required defaultValue="">
          <option value="" disabled>
            Select account
          </option>
          {accounts
            .filter(
              (account) =>
                account.active &&
                account.approvedAt &&
                ["revenue", "contra-revenue", "asset", "cogs"].includes(
                  account.class ?? "",
                ),
            )
            .map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} · {account.name} · {account.class}
              </option>
            ))}
        </select>
      </label>
      <label>
        Mapping reason
        <input name="reason" required />
      </label>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Saving…" : "Save posting mapping"}
      </button>
    </form>
  );
}
