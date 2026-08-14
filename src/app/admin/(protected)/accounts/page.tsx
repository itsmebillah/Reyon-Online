import type { Metadata } from "next";
import {
  getAccountingFoundation,
  getCogsPostingStatus,
  getCompletedSaleJournals,
  getSupplierPayableAccounting,
} from "@/features/accounting/data/accounting-foundation";
import {
  ActivationForm,
  ApproverForm,
  FinancialAccountForm,
  LedgerAccountForm,
  OpeningBalanceForm,
  PostingMappingForm,
  ProfileForm,
} from "./accounting-forms";

export const metadata: Metadata = {
  title: "Accounts & Payments",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [data, journals, cogs, payables] = await Promise.all([
    getAccountingFoundation(),
    getCompletedSaleJournals(),
    getCogsPostingStatus(),
    getSupplierPayableAccounting(),
  ]);
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
          <strong>6. Completed-sale posting mappings</strong>
          <span>{data.postingMappings.length}/6 mapped</span>
        </summary>
        <p>
          Product Sales and Delivery Revenue require approved revenue accounts.
          Sales Discounts requires contra-revenue; Inventory requires an asset;
          Cost of Sales requires a COGS account; Accounts Payable requires a
          liability. Names are never inferred.
        </p>
        {data.postingMappings.map((mapping) => (
          <p key={mapping.purpose}>
            {mapping.purpose} · {mapping.accountCode} · {mapping.accountName}
          </p>
        ))}
        {data.canConfigure && <PostingMappingForm accounts={data.accounts} />}
      </details>

      <details className="brand-editor" open={!data.profile.postingEnabled}>
        <summary>
          <strong>7. Validate and activate</strong>
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
        aria-labelledby="journal-title"
      >
        <div className="brand-list-heading">
          <h2 id="journal-title">Completed-sale journals</h2>
          <span>{journals.length}</span>
        </div>
        {journals.length ? (
          journals.map((journal) => (
            <details className="brand-editor" key={journal.id}>
              <summary>
                <strong>
                  {journal.reference} · {journal.description}
                </strong>
                <span>
                  Debit {Number(journal.totalDebit).toFixed(2)} = Credit{" "}
                  {Number(journal.totalCredit).toFixed(2)}
                </span>
              </summary>
              <p>
                {journal.sourceModule} · {journal.sourceReference} ·{" "}
                {journal.postingSource} ·{" "}
                {new Date(journal.postingDate).toLocaleString("en-BD")}
              </p>
              {journal.lines.map((line, index) => (
                <p key={index}>
                  {line.accountCode} · {line.accountName} — Debit{" "}
                  {Number(line.debit).toFixed(2)} / Credit{" "}
                  {Number(line.credit).toFixed(2)}
                </p>
              ))}
            </details>
          ))
        ) : (
          <p className="admin-empty">
            No Completed sale revenue journal has been posted.
          </p>
        )}
      </section>

      <section className="brand-management-list" aria-labelledby="cogs-title">
        <div className="brand-list-heading">
          <h2 id="cogs-title">COGS posting status</h2>
          <span>{cogs.postings.length} posted</span>
        </div>
        {cogs.postings.map((posting) => (
          <article className="brand-editor" key={posting.journalReference}>
            <strong>
              {posting.journalReference} · {posting.orderReference}
            </strong>
            <p>
              Quantity {Number(posting.quantity)} · WAC BDT{" "}
              {Number(posting.weightedAverageCost).toFixed(6)} · COGS BDT{" "}
              {Number(posting.amount).toFixed(2)}
            </p>
          </article>
        ))}
        {cogs.exceptions.map((exception) => (
          <article
            className="brand-editor"
            key={`${exception.sourceSaleId}-${exception.key}`}
          >
            <strong>Blocked · {exception.key}</strong>
            <p>{exception.detail}</p>
          </article>
        ))}
        {!cogs.postings.length && !cogs.exceptions.length && (
          <p className="admin-empty">No COGS posting activity is available.</p>
        )}
      </section>

      <section
        className="brand-management-list"
        aria-labelledby="supplier-payable-title"
      >
        <div className="brand-list-heading">
          <h2 id="supplier-payable-title">Supplier payable accounting</h2>
          <span>{payables.events.length} events</span>
        </div>
        {payables.balances.map((balance) => (
          <article className="brand-editor" key={balance.supplierId}>
            <strong>{balance.supplierName}</strong>
            <p>
              Accounting outstanding BDT{" "}
              {Number(balance.outstandingAmount).toFixed(2)}
            </p>
          </article>
        ))}
        {payables.events.map((event) => (
          <article
            className="brand-editor"
            key={`${event.eventType}-${event.sourceReference}`}
          >
            <strong>
              {event.journalReference} · {event.supplierName}
            </strong>
            <p>
              {event.eventType} · BDT {Number(event.amount).toFixed(2)} · PO{" "}
              {event.poReference} · Receipt {event.receiptReference ?? "—"} ·
              Return {event.returnReference ?? "—"}
            </p>
          </article>
        ))}
        {payables.exceptions.map((exception) => (
          <article
            className="brand-editor"
            key={`${exception.sourceNamespace}-${exception.sourceReference}-${exception.key}`}
          >
            <strong>Blocked · {exception.key}</strong>
            <p>{exception.detail}</p>
          </article>
        ))}
        {!payables.events.length &&
          !payables.balances.length &&
          !payables.exceptions.length && (
            <p className="admin-empty">
              No supplier payable accounting activity is available.
            </p>
          )}
      </section>

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
