import type { Metadata } from "next";
import { getAccountingFoundation } from "@/features/accounting/data/accounting-foundation";
import {
  ActivationForm,
  ApproverForm,
  FinancialAccountForm,
  LedgerAccountForm,
  OpeningBalanceForm,
  ProfileForm,
} from "./accounting-forms";

export const metadata: Metadata = {
  title: "Accounts & Payments",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const data = await getAccountingFoundation();
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="accounts-title"
    >
      <header>
        <p className="eyebrow">Sprint 21</p>
        <h1 id="accounts-title">Accounts & Payments</h1>
        <p>
          Enter only Finance-approved production configuration. Posting remains
          disabled until every control passes and an authorized approver
          explicitly activates it.
        </p>
      </header>

      <div className="admin-kpi-grid">
        <article>
          <span>Basis</span>
          <strong>{data.profile.basis}</strong>
        </article>
        <article>
          <span>Valuation</span>
          <strong>{data.profile.valuationMethod}</strong>
        </article>
        <article>
          <span>Approvers</span>
          <strong>{data.financeApprovers.length}</strong>
        </article>
        <article>
          <span>Posting</span>
          <strong>{data.profile.postingEnabled ? "Enabled" : "Blocked"}</strong>
        </article>
      </div>

      {!data.canConfigure && (
        <p className="admin-form-error" role="alert">
          This workspace is read-only for your role. A Super Admin or active
          Finance approver must make configuration changes.
        </p>
      )}

      <details className="brand-editor" open={!data.profile.isConfigured}>
        <summary>
          <strong>1. Legal entity and fiscal year</strong>
          <span>{data.profile.isConfigured ? "Saved" : "Required"}</span>
        </summary>
        <p>
          {data.profile.legalEntityName ?? "No legal entity configured"} ·
          Fiscal start {data.profile.fiscalYearStartMonth ?? "not set"}
        </p>
        {data.canConfigure && <ProfileForm profile={data.profile} />}
      </details>

      <details className="brand-editor" open={!data.financeApprovers.length}>
        <summary>
          <strong>2. Finance approver</strong>
          <span>{data.financeApprovers.length ? "Assigned" : "Required"}</span>
        </summary>
        {data.financeApprovers.map((a) => (
          <p key={a.userId}>
            {a.email} · authorized{" "}
            {new Date(a.authorizedAt).toLocaleDateString("en-BD")}
          </p>
        ))}
        {data.isSuperAdmin && (
          <ApproverForm candidates={data.adminCandidates} />
        )}
      </details>

      <details className="brand-editor" open={!data.accounts.length}>
        <summary>
          <strong>3. Approved Chart of Accounts</strong>
          <span>{data.accounts.length} accounts</span>
        </summary>
        <div className="accounting-record-list">
          {data.accounts.map((a) => (
            <p key={a.id}>
              <strong>
                {a.code} · {a.name}
              </strong>
              <span>
                {a.class} / {a.group} · {a.normalBalance} ·{" "}
                {a.approvedAt ? "Approved" : "Pending approval"}
              </span>
            </p>
          ))}
        </div>
        {data.canConfigure && <LedgerAccountForm />}
      </details>

      <details className="brand-editor" open={!data.financialAccounts.length}>
        <summary>
          <strong>4. Cash, Bank, MFS and clearing accounts</strong>
          <span>{data.financialAccounts.length} accounts</span>
        </summary>
        <div className="accounting-record-list">
          {data.financialAccounts.map((a) => (
            <p key={a.id}>
              <strong>{a.name}</strong>
              <span>
                {a.kind} · {a.provider ?? "No provider"} ·{" "}
                {a.maskedReference ?? "No reference"}
              </span>
            </p>
          ))}
        </div>
        {data.canConfigure && <FinancialAccountForm accounts={data.accounts} />}
      </details>

      <details className="brand-editor" open={!data.openingBalance}>
        <summary>
          <strong>5. Opening balances and evidence</strong>
          <span>{data.openingBalance?.status ?? "Required"}</span>
        </summary>
        {data.openingBalance && (
          <p>
            Effective {data.openingBalance.effectiveDate} · Evidence{" "}
            {data.openingBalance.evidenceReference} · Debits BDT{" "}
            {Number(data.openingBalance.debits).toFixed(2)} · Credits BDT{" "}
            {Number(data.openingBalance.credits).toFixed(2)}
          </p>
        )}
        {data.canConfigure && <OpeningBalanceForm accounts={data.accounts} />}
      </details>

      <details className="brand-editor" open={!data.profile.postingEnabled}>
        <summary>
          <strong>6. Validate and activate</strong>
          <span>
            {data.profile.postingEnabled ? "Active" : "Posting blocked"}
          </span>
        </summary>
        <p>
          Activation validates the legal profile, Finance authority, all
          approved account classes, every required financial-account type, and
          balanced opening evidence. No default monetary value is created.
        </p>
        {data.canConfigure && !data.profile.postingEnabled && (
          <ActivationForm />
        )}
      </details>

      <section
        className="brand-management-list"
        aria-labelledby="accounting-audit-title"
      >
        <div className="brand-list-heading">
          <h2 id="accounting-audit-title">Configuration audit</h2>
          <span>{data.auditEvents.length}</span>
        </div>
        {data.auditEvents.length ? (
          data.auditEvents.map((event, index) => (
            <article
              className="brand-editor"
              key={`${event.occurredAt}-${index}`}
            >
              <h3>{event.event}</h3>
              <p>
                {event.reason} · {event.actorRole} ·{" "}
                {new Date(event.occurredAt).toLocaleString("en-BD")}
              </p>
            </article>
          ))
        ) : (
          <p className="admin-empty">
            No configuration change has been recorded.
          </p>
        )}
      </section>
    </section>
  );
}
