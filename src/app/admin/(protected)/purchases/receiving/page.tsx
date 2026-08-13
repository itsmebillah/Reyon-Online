import type { Metadata } from "next";
import Link from "next/link";
import { getPurchaseReceivingQueue } from "@/features/purchasing/data/purchase-receiving";
import { ReceivingForm } from "./receiving-form";
export const metadata: Metadata = {
  title: "Purchase Receiving",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function ReceivingPage() {
  const { orders, receipts } = await getPurchaseReceivingQueue();
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="receiving-title"
    >
      <header>
        <p className="eyebrow">Purchase operations</p>
        <h1 id="receiving-title">Receiving & Inspection</h1>
        <p>
          Record observed supplier deliveries. Only accepted quantities enter
          Main Inventory; discrepancies remain unavailable and auditable.
        </p>
        <Link className="button button--secondary" href="/admin/purchases">
          Purchase order register
        </Link>
      </header>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>POs ready to receive</h2>
          <span>{orders.length}</span>
        </div>
        {orders.length ? (
          orders.map((o) => (
            <details className="brand-editor" key={o.id}>
              <summary>
                <span>
                  <strong>{o.reference}</strong>
                  <small>
                    {o.supplierName} · {o.status}
                  </small>
                </span>
                <span>Receive</span>
              </summary>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Ordered</th>
                      <th>Received</th>
                      <th>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.lines.map((l) => (
                      <tr key={l.id}>
                        <td>
                          {l.productName} — {l.variantLabel}
                          <small>{l.sku}</small>
                        </td>
                        <td>{l.orderedQuantity}</td>
                        <td>{l.receivedQuantity}</td>
                        <td>
                          {Math.max(0, l.orderedQuantity - l.receivedQuantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ReceivingForm order={o} />
            </details>
          ))
        ) : (
          <p className="admin-empty">
            No Approved or Ordered purchase orders are waiting for receipt.
          </p>
        )}
        <div className="brand-list-heading">
          <h2>Receipt history</h2>
          <span>{receipts.length}</span>
        </div>
        {receipts.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Receipt / PO</th>
                  <th>Product</th>
                  <th>Disposition</th>
                  <th>Traceability</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.receiptReference}</strong>
                      <small>
                        {r.poReference} · {r.supplierName}
                      </small>
                    </td>
                    <td>
                      {r.productName} — {r.variantLabel}
                    </td>
                    <td>
                      Accepted {r.accepted} · Damaged/rejected{" "}
                      {r.damagedRejected} · Quarantine {r.quarantined} · Short{" "}
                      {r.short}
                      {r.excess > 0 ? ` · Excess ${r.excess}` : ""}
                    </td>
                    <td>
                      {r.batchCode ? `Batch ${r.batchCode}` : "No batch"}
                      {r.expiresOn ? ` · Exp ${r.expiresOn}` : ""}
                      <small>
                        {r.supplierDeliveryReference ??
                          r.evidenceReference ??
                          "No external reference"}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">No purchase receipts recorded yet.</p>
        )}
      </div>
    </section>
  );
}
