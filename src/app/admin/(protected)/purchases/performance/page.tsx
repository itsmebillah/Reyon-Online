import type { Metadata } from "next";
import Link from "next/link";
import { getSupplierPerformanceOverview } from "@/features/purchasing/data/supplier-performance";
import { closePurchaseOrder } from "./actions";
export const metadata: Metadata = {
  title: "Purchase Closeout",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
const money = (value: number) => `BDT ${Number(value).toFixed(2)}`;
export default async function PurchasePerformancePage() {
  const data = await getSupplierPerformanceOverview();
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="purchase-performance-title"
    >
      <header>
        <p className="eyebrow">Purchase operations</p>
        <h1 id="purchase-performance-title">Closeout & Supplier Performance</h1>
        <p>
          Close fully received purchase orders and review factual operating
          history. Metrics never suspend suppliers or create reorders
          automatically.
        </p>
        <Link
          className="button button--secondary"
          href="/admin/purchases/payments"
        >
          Supplier Payments
        </Link>
      </header>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>Ready for closeout</h2>
          <span>{data.closeableOrders.length}</span>
        </div>
        {data.closeableOrders.length ? (
          data.closeableOrders.map((order) => (
            <article className="brand-editor" key={order.id}>
              <h3>{order.reference}</h3>
              <p>
                {order.supplierName} · payable {money(order.eligiblePayable)} ·
                paid {money(order.paidAmount)}
              </p>
              <form action={closePurchaseOrder} className="catalog-admin-form">
                <input type="hidden" name="poId" value={order.id} />
                <label>
                  Closeout note <span>(optional)</span>
                  <textarea name="note" />
                </label>
                <button className="button button--primary">
                  Close purchase order
                </button>
              </form>
            </article>
          ))
        ) : (
          <p className="admin-empty">
            No fully received PO is awaiting closeout.
          </p>
        )}
      </div>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>Supplier operating history</h2>
          <span>{data.suppliers.length}</span>
        </div>
        {data.suppliers.map((supplier) => (
          <article className="brand-editor" key={supplier.id}>
            <h3>{supplier.name}</h3>
            <p>
              {supplier.status} · POs {supplier.poCount} · closed{" "}
              {supplier.closedCount} · receipts {supplier.receiptCount}
            </p>
            <p>
              Discrepancies {supplier.discrepancyCount} · returns{" "}
              {supplier.returnCount} · verified paid{" "}
              {money(supplier.verifiedPaid)} · outstanding{" "}
              {money(supplier.outstanding)}
            </p>
          </article>
        ))}
      </div>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>Manual replenishment view</h2>
          <span>{data.replenishment.length}</span>
        </div>
        {data.replenishment.map((item) => (
          <article className="brand-editor" key={item.variantId}>
            <h3>
              {item.productName} — {item.variantLabel}
            </h3>
            <p>
              {item.sku} · on hand {item.onHand} · preferred {item.supplierName}
            </p>
            <p>
              MOQ {item.moq} · pack {item.packSize} · {money(item.purchaseCost)}{" "}
              · lead time {item.leadTimeDays} days
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
