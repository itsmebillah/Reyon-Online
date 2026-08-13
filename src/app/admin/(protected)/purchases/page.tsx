import type { Metadata } from "next";
import { getPurchaseOrderRegister } from "@/features/purchasing/data/purchase-order-management";
import {
  CreatePurchaseOrderForm,
  PurchaseDiscountForm,
  PurchaseLineForm,
} from "./purchase-forms";
import {
  amendPurchaseOrder,
  cancelPurchaseOrder,
  transitionPurchaseOrder,
} from "./actions";
export const metadata: Metadata = {
  title: "Purchase Orders",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
type Query = Readonly<{ q?: string; status?: string }>;
const money = (n: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(n);
const next: Record<string, { state: string; label: string }> = {
  draft: { state: "pending-approval", label: "Submit for approval" },
  "pending-approval": { state: "approved", label: "Approve PO" },
  approved: { state: "ordered", label: "Mark as ordered" },
};
export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const data = await getPurchaseOrderRegister(),
    query = await searchParams,
    term = query.q?.toLowerCase().trim() ?? "",
    status = query.status ?? "all";
  const orders = data.orders.filter(
    (o) =>
      (status === "all" || o.status === status) &&
      (!term ||
        o.reference.toLowerCase().includes(term) ||
        o.supplierName.toLowerCase().includes(term)),
  );
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="purchase-title"
    >
      <header>
        <p className="eyebrow">Purchase operations</p>
        <h1 id="purchase-title">Purchase Orders</h1>
        <p>
          Create, approve, order, amend, and audit BDT supplier commitments.
          Inventory changes only during receiving.
        </p>
      </header>
      <article className="admin-module-card">
        <span>New commitment workflow</span>
        <h2>Create draft PO</h2>
        <CreatePurchaseOrderForm suppliers={data.suppliers} />
      </article>
      <form className="brand-toolbar" method="get">
        <label>
          Search
          <input
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder="PO number or supplier"
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="all">All statuses</option>
            {[
              "draft",
              "pending-approval",
              "approved",
              "ordered",
              "partially-received",
              "fully-received",
              "closed",
              "cancelled",
              "rejected",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="button button--primary">Apply</button>
      </form>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>PO register</h2>
          <span>{orders.length}</span>
        </div>
        {orders.length ? (
          orders.map((o) => {
            const rel = data.relationships.filter(
              (r) => r.supplierId === o.supplierId,
            );
            const availableTransition = next[o.status];
            return (
              <details className="brand-editor" key={o.id}>
                <summary>
                  <span>
                    <strong>{o.reference}</strong>
                    <small>
                      {o.supplierName} · {o.status}
                      {o.isEmergency ? " · Emergency" : ""} ·{" "}
                      {money(o.totals.total)}
                    </small>
                  </span>
                  <span>Manage</span>
                </summary>
                <dl className="brand-audit">
                  <div>
                    <dt>Currency</dt>
                    <dd>BDT</dd>
                  </div>
                  <div>
                    <dt>Amendment</dt>
                    <dd>{o.amendmentNumber}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(o.createdAt).toLocaleString("en-GB")}</dd>
                  </div>
                </dl>
                {o.status === "draft" && (
                  <>
                    <h3>Purchase lines</h3>
                    <PurchaseLineForm orderId={o.id} relationships={rel} />
                    <h3>Order discount</h3>
                    <PurchaseDiscountForm orderId={o.id} />
                  </>
                )}
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Units / packs</th>
                        <th>Unit cost</th>
                        <th>Discount</th>
                        <th>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.lines.map((l) => (
                        <tr key={l.id}>
                          <td>
                            {l.productName} — {l.variantLabel}
                            <small>{l.sku}</small>
                          </td>
                          <td>
                            {l.quantity}
                            {l.orderUnit === "pack"
                              ? ` (${l.packCount} × ${l.packSize})`
                              : " units"}
                          </td>
                          <td>{money(l.unitCost)}</td>
                          <td>
                            {l.discountType
                              ? `${l.discountValue}${l.discountType === "percentage" ? "%" : " BDT"}`
                              : "—"}
                          </td>
                          <td>{money(l.lineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <dl className="brand-audit">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{money(o.totals.subtotal)}</dd>
                  </div>
                  <div>
                    <dt>Line discounts</dt>
                    <dd>{money(o.totals.lineDiscount)}</dd>
                  </div>
                  <div>
                    <dt>Order discount</dt>
                    <dd>{money(o.totals.orderDiscount)}</dd>
                  </div>
                  <div>
                    <dt>Total</dt>
                    <dd>
                      <strong>{money(o.totals.total)}</strong>
                    </dd>
                  </div>
                </dl>
                {availableTransition && (
                  <form
                    action={transitionPurchaseOrder}
                    className="catalog-admin-form"
                  >
                    <input type="hidden" name="orderId" value={o.id} />
                    <input
                      type="hidden"
                      name="toState"
                      value={availableTransition.state}
                    />
                    <button className="button button--primary">
                      {availableTransition.label}
                    </button>
                  </form>
                )}
                {o.status === "pending-approval" && (
                  <form
                    action={transitionPurchaseOrder}
                    className="catalog-admin-form"
                  >
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="toState" value="rejected" />
                    <label>
                      Rejection reason
                      <input name="reason" required />
                    </label>
                    <button className="button button--secondary">
                      Reject PO
                    </button>
                  </form>
                )}
                {o.status === "approved" && (
                  <form
                    action={amendPurchaseOrder}
                    className="catalog-admin-form"
                  >
                    <input type="hidden" name="orderId" value={o.id} />
                    <label>
                      Amendment reason
                      <input name="reason" required />
                    </label>
                    <button className="button button--secondary">
                      Open controlled amendment
                    </button>
                  </form>
                )}
                {["draft", "pending-approval", "approved", "ordered"].includes(
                  o.status,
                ) && (
                  <form
                    action={cancelPurchaseOrder}
                    className="catalog-admin-form"
                  >
                    <input type="hidden" name="orderId" value={o.id} />
                    <label>
                      Cancellation reason
                      <input name="reason" required />
                    </label>
                    <button className="button button--secondary">
                      Cancel PO
                    </button>
                  </form>
                )}
                <h3>Audit history</h3>
                <ol>
                  {o.history.map((h) => (
                    <li key={h.sequence}>
                      <strong>{h.toState}</strong> ·{" "}
                      {new Date(h.occurredAt).toLocaleString("en-GB")} ·{" "}
                      {h.actorRole ?? "system"}
                      {h.reason ? ` — ${h.reason}` : ""}
                    </li>
                  ))}
                </ol>
              </details>
            );
          })
        ) : (
          <p className="admin-empty">No purchase orders match this view.</p>
        )}
      </div>
    </section>
  );
}
