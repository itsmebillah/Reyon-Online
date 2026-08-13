import type { Metadata } from "next";
import { getAccountingFoundation } from "@/features/accounting/data/accounting-foundation";
export const metadata: Metadata = {
  title: "Accounts & Payments",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function AccountsPage() {
  const data = await getAccountingFoundation();
  const ready =
    data.profile.isConfigured &&
    data.financeApproverCount > 0 &&
    data.accounts.length > 0 &&
    data.financialAccounts.length > 0;
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="accounts-title"
    >
      <header>
        <p className="eyebrow">Sprint 21</p>
        <h1 id="accounts-title">Accounts & Payments</h1>
        <p>
          Accrual accounting configuration and control readiness. Financial
          posting remains disabled until required production configuration is
          complete.
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
          <span>Periods</span>
          <strong>{data.periods.length}</strong>
        </article>
        <article>
          <span>Posting</span>
          <strong>{ready ? "Ready" : "Blocked"}</strong>
        </article>
      </div>
      <article className="admin-module-card">
        <span>Production configuration</span>
        <h2>
          {ready ? "Foundation configured" : "Required details are pending"}
        </h2>
        <p>
          Legal entity: {data.profile.legalEntityName ?? "Not configured"} ·
          Fiscal start: {data.profile.fiscalYearStartMonth ?? "Not configured"}{" "}
          · Finance approvers: {data.financeApproverCount}
        </p>
        <p>
          Timezone {data.profile.timezone} · Currency {data.profile.currency}
        </p>
      </article>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>Chart of accounts</h2>
          <span>{data.accounts.length}</span>
        </div>
        {data.accounts.length ? (
          data.accounts.map((a) => (
            <article className="brand-editor" key={a.code}>
              <h3>
                {a.code} · {a.name}
              </h3>
              <p>
                {a.class ?? "Unclassified"} · {a.group ?? "No group"} ·{" "}
                {a.active ? "Active" : "Inactive"}
              </p>
            </article>
          ))
        ) : (
          <p className="admin-empty">
            No Finance-approved ledger accounts have been configured.
          </p>
        )}
      </div>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>Monthly periods</h2>
          <span>{data.periods.length}</span>
        </div>
        {data.periods.length ? (
          data.periods.map((p) => (
            <article className="brand-editor" key={p.key}>
              <h3>{p.key}</h3>
              <p>
                {p.startDate} – {p.endDate} · {p.status}
              </p>
            </article>
          ))
        ) : (
          <p className="admin-empty">
            Fiscal-year configuration is required before monthly periods can be
            generated.
          </p>
        )}
      </div>
    </section>
  );
}
