import type { Metadata } from "next";
import Link from "next/link";
import { getCompletedSales } from "@/features/sales/data/sales-management";

export const metadata: Metadata = {
  title: "Sales Processing",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const money = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(amount);

const date = (value: string) =>
  new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));

export default async function SalesPage() {
  const sales = await getCompletedSales();
  const productSales = sales.reduce(
    (total, sale) => total + Number(sale.productSales),
    0,
  );
  const deliveryCharges = sales.reduce(
    (total, sale) => total + Number(sale.deliveryCharge),
    0,
  );

  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="sales-title"
    >
      <header>
        <p className="eyebrow">Commercial operations</p>
        <h1 id="sales-title">Sales Processing</h1>
        <p>
          Review official completed sales. Delivered orders remain outside this
          register until their lifecycle reaches Completed.
        </p>
      </header>

      <div className="admin-module-grid">
        <article className="admin-module-card">
          <span>Completed sales</span>
          <h2>{sales.length}</h2>
          <p>Official sale records</p>
        </article>
        <article className="admin-module-card">
          <span>Product sales</span>
          <h2>{money(productSales)}</h2>
          <p>Excludes delivery charges</p>
        </article>
        <article className="admin-module-card">
          <span>Delivery charges</span>
          <h2>{money(deliveryCharges)}</h2>
          <p>Reported separately</p>
        </article>
      </div>

      <article className="admin-module-card order-list-card">
        <span>Completed-sale register</span>
        <h2>Auditable sale evidence</h2>
        {sales.length ? (
          <div className="inventory-table-wrap">
            <table className="inventory-table order-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Completed</th>
                  <th>Documents</th>
                  <th>Payment</th>
                  <th>Product sales</th>
                  <th>Delivery</th>
                  <th>Grand total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <strong>
                        <Link href={`/admin/orders/${sale.orderId}`}>
                          {sale.orderNumber}
                        </Link>
                      </strong>
                    </td>
                    <td>{date(sale.completedAt)}</td>
                    <td>
                      <strong>Invoice #{sale.invoiceNumber}</strong>
                      <small>
                        {sale.receiptNumber
                          ? `Receipt #${sale.receiptNumber}`
                          : "No payment receipt"}
                      </small>
                    </td>
                    <td>
                      <strong>{sale.paymentMethod}</strong>
                      <small>{sale.paymentState}</small>
                    </td>
                    <td>{money(Number(sale.productSales))}</td>
                    <td>{money(Number(sale.deliveryCharge))}</td>
                    <td>
                      <strong>{money(Number(sale.grandTotal))}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">
            No orders have reached Completed yet. Completed orders will appear
            here automatically.
          </p>
        )}
      </article>
    </section>
  );
}
