import type { Metadata } from "next";
import Link from "next/link";
import { getSupplierPaymentQueue } from "@/features/purchasing/data/supplier-payments";
import {
  decideSupplierPayment,
  setPurchaseCreditTerms,
  setPurchasePayableDispute,
} from "./actions";
import { SupplierPaymentForm } from "./payment-form";

export const metadata: Metadata = {
  title: "Supplier Payments",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
const money = (value: number) => `BDT ${Number(value).toFixed(2)}`;

export default async function SupplierPaymentsPage() {
  const data = await getSupplierPaymentQueue();
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="supplier-payments-title"
    >
      <header>
        <p className="eyebrow">Purchase operations</p>
        <h1 id="supplier-payments-title">Supplier Payments</h1>
        <p>
          Record manual BDT settlements and verify evidence without rewriting
          purchase or receipt history.
        </p>
        <Link
          className="button button--secondary"
          href="/admin/purchases/returns"
        >
          Purchase Returns
        </Link>
        <Link
          className="button button--secondary"
          href="/admin/purchases/performance"
        >
          Closeout & Performance
        </Link>
      </header>
      <article className="admin-module-card">
        <span>Manual settlement</span>
        <h2>Record supplier payment</h2>
        <SupplierPaymentForm payables={data.payables} />
      </article>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>Supplier payables</h2>
          <span>{data.payables.length}</span>
        </div>
        {data.payables.map((item) => (
          <details className="brand-editor" key={item.poId}>
            <summary>
              <span>
                <strong>{item.poReference}</strong>
                <small>
                  {item.supplierName} · {item.status}
                </small>
              </span>
              <span>Manage</span>
            </summary>
            <p>
              PO total {money(item.poTotal)} · received/eligible{" "}
              {money(item.eligiblePayable)}
            </p>
            <p>
              Verified paid {money(item.paidAmount)} · pending{" "}
              {money(item.pendingAmount)} · outstanding{" "}
              {money(item.outstandingAmount)}
            </p>
            <p>
              {item.isCreditPurchase
                ? `Credit purchase · due ${item.dueOn ?? "not set"}`
                : "Immediate payment terms"}
            </p>
            <form
              action={setPurchaseCreditTerms}
              className="catalog-admin-form"
            >
              <input type="hidden" name="poId" value={item.poId} />
              <label>
                Terms
                <select
                  name="isCredit"
                  defaultValue={String(item.isCreditPurchase)}
                >
                  <option value="false">Immediate</option>
                  <option value="true">Credit purchase</option>
                </select>
              </label>
              <label>
                Due date
                <input name="dueOn" type="date" />
              </label>
              <label>
                Reason
                <textarea name="reason" required />
              </label>
              <button className="button button--secondary">
                Update payment terms
              </button>
            </form>
            <form
              action={setPurchasePayableDispute}
              className="catalog-admin-form"
            >
              <input type="hidden" name="poId" value={item.poId} />
              <input
                type="hidden"
                name="disputed"
                value={String(!item.isDisputed)}
              />
              <label>
                {item.isDisputed ? "Resolution reason" : "Dispute reason"}
                <textarea name="reason" required />
              </label>
              <button className="button button--secondary">
                {item.isDisputed ? "Resolve dispute" : "Mark disputed"}
              </button>
            </form>
          </details>
        ))}
      </div>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>Payment evidence</h2>
          <span>{data.payments.length}</span>
        </div>
        {data.payments.length ? (
          data.payments.map((payment) => (
            <details className="brand-editor" key={payment.id}>
              <summary>
                <span>
                  <strong>{payment.paymentReference}</strong>
                  <small>
                    {payment.poReference} · {payment.supplierName} ·{" "}
                    {payment.status}
                  </small>
                </span>
                <span>Review</span>
              </summary>
              <p>
                {money(payment.amount)} · {payment.paymentDate} ·{" "}
                {payment.method}
              </p>
              <p>
                Transaction {payment.providerReference} · Evidence{" "}
                {payment.evidenceReference}
              </p>
              {payment.status === "pending-verification" && (
                <div className="admin-actions-row">
                  <form action={decideSupplierPayment}>
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <input type="hidden" name="target" value="verified" />
                    <button className="button button--primary">
                      Verify payment
                    </button>
                  </form>
                  <form
                    action={decideSupplierPayment}
                    className="catalog-admin-form"
                  >
                    <input type="hidden" name="paymentId" value={payment.id} />
                    <input type="hidden" name="target" value="rejected" />
                    <label>
                      Rejection reason
                      <textarea name="reason" required />
                    </label>
                    <button className="button button--secondary">
                      Reject evidence
                    </button>
                  </form>
                </div>
              )}
              <h3>Append-only history</h3>
              <ol>
                {payment.history.map((event) => (
                  <li key={event.sequence}>
                    <strong>{event.toState}</strong> ·{" "}
                    {new Date(event.occurredAt).toLocaleString("en-GB")} ·{" "}
                    {event.actorRole}
                    {event.reason ? ` — ${event.reason}` : ""}
                  </li>
                ))}
              </ol>
            </details>
          ))
        ) : (
          <p className="admin-empty">
            No supplier payment evidence recorded yet.
          </p>
        )}
      </div>
    </section>
  );
}
