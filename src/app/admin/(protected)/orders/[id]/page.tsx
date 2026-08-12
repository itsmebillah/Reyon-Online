import { notFound } from "next/navigation";
import { getOrderDetail } from "@/features/orders/data/order-management";
import { TransitionForm } from "../transition-form";

const label = (value: string) =>
  value
    .split("-")
    .map((v) => v[0]?.toUpperCase() + v.slice(1))
    .join(" ");
const money = (value: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(
    value,
  );
const date = (value: string) =>
  new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let order;
  try {
    order = await getOrderDetail(id);
  } catch {
    notFound();
  }
  return (
    <section className="admin-dashboard catalog-admin">
      <header>
        <p className="eyebrow">Order detail</p>
        <h1>{order.orderNumber}</h1>
        <p>
          {label(order.state)} · Created {date(order.occurredAt)}
        </p>
      </header>
      <div className="admin-module-grid">
        <article className="admin-module-card">
          <span>Customer & delivery</span>
          <h2>{order.address.full_name}</h2>
          <p>{order.address.phone}</p>
          <p>
            {order.address.house_no}, {order.address.road},{" "}
            {order.address.village_city}, {order.address.district},{" "}
            {order.address.division}
          </p>
          <p>{order.delivery.zone_name_snapshot}</p>
        </article>
        <article className="admin-module-card">
          <span>Payment</span>
          <h2>{order.payment.method_name_snapshot}</h2>
          <p>{label(order.payment.evidence_state_key)}</p>
          <p>
            {order.payment.transaction_reference ?? "No transaction reference"}
          </p>
        </article>
        <article className="admin-module-card">
          <span>Order total</span>
          <h2>{money(Number(order.total))}</h2>
          <p>Items {money(Number(order.subtotal))}</p>
          <p>Delivery {money(Number(order.deliveryAmount))}</p>
        </article>
      </div>
      <article className="admin-module-card">
        <span>Commercial snapshot</span>
        <h2>Order lines</h2>
        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Quantity</th>
                <th>Unit price</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.id}>
                  <td>
                    <strong>{line.product_name_snapshot}</strong>
                    <small>{line.variant_label_snapshot}</small>
                  </td>
                  <td>{line.sku_snapshot}</td>
                  <td>{line.quantity}</td>
                  <td>{money(Number(line.unit_price_amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <article className="admin-module-card">
        <span>Append-only lifecycle</span>
        <h2>History</h2>
        {order.history.map((item) => (
          <p key={item.sequence}>
            <strong>{label(item.to)}</strong> · {date(item.occurredAt)}
            {item.reason ? ` · ${item.reason}` : ""}
          </p>
        ))}
      </article>
      <article className="admin-module-card">
        <span>Controlled action</span>
        <h2>Advance or resolve</h2>
        <TransitionForm
          orderId={order.id}
          transitions={order.allowedTransitions}
        />
      </article>
    </section>
  );
}
