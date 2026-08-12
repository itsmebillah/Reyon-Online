import type { Metadata } from "next";
import { getOrderManagementDashboard } from "@/features/orders/data/order-management";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Order Management",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const date = (value: string) =>
  new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
const money = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(amount);
const label = (value: string) =>
  value
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string }>;
}) {
  const filters = await searchParams;
  const data = await getOrderManagementDashboard({
    query: filters.q?.trim(),
    state: filters.state?.trim(),
  });
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="orders-title"
    >
      <header>
        <p className="eyebrow">Sales operations</p>
        <h1 id="orders-title">Order Management</h1>
        <p>
          Find every customer order by its immutable REYON reference and review
          current payment, delivery, and reservation facts.
        </p>
      </header>
      <p>
        <Link className="button button--secondary" href="/admin/orders/reviews">
          Open cancellation & review queue
        </Link>
      </p>
      <form className="brand-toolbar" method="get" role="search">
        <label>
          <span>Search orders</span>
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Order number, customer, or phone"
          />
        </label>
        <label>
          <span>Status</span>
          <select name="state" defaultValue={filters.state ?? ""}>
            <option value="">All statuses</option>
            {data.states.map((state) => (
              <option key={state.key} value={state.key}>
                {state.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button button--primary">Apply</button>
      </form>
      <article className="admin-module-card order-list-card">
        <span>Live order register</span>
        <h2>{data.orders.length} orders</h2>
        {data.orders.length ? (
          <div className="inventory-table-wrap">
            <table className="inventory-table order-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Delivery</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>
                        <Link href={`/admin/orders/${order.id}`}>
                          {order.orderNumber}
                        </Link>
                      </strong>
                      <small>
                        {date(order.occurredAt)} · {order.lineCount} item
                        {order.lineCount === 1 ? "" : "s"}
                      </small>
                    </td>
                    <td>
                      <strong>{order.customerName}</strong>
                      <small>{order.phone}</small>
                    </td>
                    <td>
                      <span
                        className={`status-pill status-pill--${order.state}`}
                      >
                        {label(order.state)}
                      </span>
                      {order.reservationExpiresAt && (
                        <small>
                          Reserved until {date(order.reservationExpiresAt)}
                        </small>
                      )}
                    </td>
                    <td>
                      <strong>{order.paymentMethod}</strong>
                      <small>{label(order.paymentState)}</small>
                    </td>
                    <td>{order.deliveryZone}</td>
                    <td>
                      <strong>{money(Number(order.total))}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">No orders match these filters.</p>
        )}
      </article>
    </section>
  );
}
