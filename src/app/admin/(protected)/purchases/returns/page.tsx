import type { Metadata } from "next";
import Link from "next/link";
import { getPurchaseReturnQueue } from "@/features/purchasing/data/purchase-returns";
import { PurchaseReturnRequestForm } from "./request-form";
import { transitionPurchaseReturn } from "./actions";
export const metadata: Metadata = {
  title: "Purchase Returns",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
const next: Record<string, { target: string; label: string }> = {
  requested: { target: "approved", label: "Approve return" },
  approved: { target: "awaiting-return", label: "Prepare supplier return" },
  returned: { target: "completed", label: "Complete return" },
};
export default async function PurchaseReturnsPage() {
  const data = await getPurchaseReturnQueue();
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="purchase-return-title"
    >
      <header>
        <p className="eyebrow">Purchase operations</p>
        <h1 id="purchase-return-title">Purchase Returns</h1>
        <p>
          Return eligible accepted receipt quantities to suppliers without
          rewriting PO, receipt, or inventory history.
        </p>
        <Link
          className="button button--secondary"
          href="/admin/purchases/receiving"
        >
          Receiving & Inspection
        </Link>
        <Link
          className="button button--secondary"
          href="/admin/purchases/payments"
        >
          Supplier Payments
        </Link>
      </header>
      <article className="admin-module-card">
        <span>New supplier return</span>
        <h2>Request purchase return</h2>
        <PurchaseReturnRequestForm eligible={data.eligible} />
      </article>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>Supplier return history</h2>
          <span>{data.returns.length}</span>
        </div>
        {data.returns.length ? (
          data.returns.map((r) => {
            const availableTransition = next[r.status];

            return (
              <details className="brand-editor" key={r.id}>
                <summary>
                  <span>
                    <strong>{r.reference}</strong>
                    <small>
                      {r.poReference} · {r.supplierName} · {r.status}
                    </small>
                  </span>
                  <span>Manage</span>
                </summary>
                <p>
                  {r.productName} — {r.variantLabel} · Quantity {r.quantity}
                </p>
                <p>
                  Reason: {r.reason} · {r.note}
                </p>
                <p>
                  {r.batchCode ? `Batch ${r.batchCode}` : "No batch"}
                  {r.expiresOn ? ` · Exp ${r.expiresOn}` : ""}
                </p>
                {availableTransition && (
                  <form
                    action={transitionPurchaseReturn}
                    className="catalog-admin-form"
                  >
                    <input type="hidden" name="returnId" value={r.id} />
                    <input
                      type="hidden"
                      name="target"
                      value={availableTransition.target}
                    />
                    <button className="button button--primary">
                      {availableTransition.label}
                    </button>
                  </form>
                )}
                {r.status === "requested" && (
                  <form
                    action={transitionPurchaseReturn}
                    className="catalog-admin-form"
                  >
                    <input type="hidden" name="returnId" value={r.id} />
                    <input type="hidden" name="target" value="rejected" />
                    <label>
                      Rejection note
                      <textarea name="note" required />
                    </label>
                    <button className="button button--secondary">
                      Reject return
                    </button>
                  </form>
                )}
                {r.status === "awaiting-return" && (
                  <form
                    action={transitionPurchaseReturn}
                    className="catalog-admin-form"
                  >
                    <input type="hidden" name="returnId" value={r.id} />
                    <input type="hidden" name="target" value="returned" />
                    <label>
                      Supplier/courier return evidence
                      <input name="evidenceReference" required />
                    </label>
                    <label>
                      Return note <span>(optional)</span>
                      <textarea name="note" />
                    </label>
                    <button className="button button--primary">
                      Record physical return
                    </button>
                  </form>
                )}
                {["requested", "approved", "awaiting-return"].includes(
                  r.status,
                ) && (
                  <form
                    action={transitionPurchaseReturn}
                    className="catalog-admin-form"
                  >
                    <input type="hidden" name="returnId" value={r.id} />
                    <input type="hidden" name="target" value="cancelled" />
                    <label>
                      Cancellation note
                      <textarea name="note" required />
                    </label>
                    <button className="button button--secondary">
                      Cancel return
                    </button>
                  </form>
                )}
                <h3>Audit history</h3>
                <ol>
                  {r.history.map((h) => (
                    <li key={h.sequence}>
                      <strong>{h.toState}</strong> ·{" "}
                      {new Date(h.occurredAt).toLocaleString("en-GB")} ·{" "}
                      {h.actorRole}
                      {h.note ? ` — ${h.note}` : ""}
                    </li>
                  ))}
                </ol>
              </details>
            );
          })
        ) : (
          <p className="admin-empty">No purchase returns recorded yet.</p>
        )}
      </div>
    </section>
  );
}
