import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { formatMoney } from "@/features/catalog";
import { getCheckoutOrderSuccess } from "@/features/orders/data/checkout-order-success";

export const metadata: Metadata = {
  title: "Order placed",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const statusLabel = (status: string) =>
  status
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default async function CheckoutSuccessPage() {
  const order = await getCheckoutOrderSuccess();
  if (!order) redirect("/cart");
  const address = [
    order.address.flatNo ? `Flat ${order.address.flatNo}` : null,
    `House ${order.address.houseNo}`,
    order.address.road,
    order.address.villageCity,
    order.address.thanaUpazila,
    order.address.district,
    order.address.division,
  ].filter(Boolean);

  return (
    <Container className="page checkout-success-page">
      <article
        className="checkout-success-card"
        aria-labelledby="success-title"
      >
        <div className="checkout-success-mark" aria-hidden="true">
          ✓
        </div>
        <p className="eyebrow">Order confirmed</p>
        <h1 id="success-title">Your order has been placed successfully.</h1>
        <p className="checkout-success-reference">{order.orderReference}</p>

        <dl className="checkout-success-details">
          <div>
            <dt>Order status</dt>
            <dd>{statusLabel(order.status)}</dd>
          </div>
          <div>
            <dt>Payment method</dt>
            <dd>{order.paymentMethod}</dd>
          </div>
          <div>
            <dt>Total amount</dt>
            <dd>
              {formatMoney({
                amount: Number(order.totalAmount),
                currency: order.currency,
              })}
            </dd>
          </div>
          <div>
            <dt>Delivery zone</dt>
            <dd>{order.deliveryZone}</dd>
          </div>
        </dl>

        <section
          className="checkout-success-address"
          aria-labelledby="delivery-title"
        >
          <h2 id="delivery-title">Delivery summary</h2>
          <p>
            {order.address.fullName} · {order.address.phone}
          </p>
          <p>{address.join(", ")}</p>
        </section>

        <div className="checkout-success-actions">
          <Link className="button button--primary" href="/account">
            View Order / My Orders
          </Link>
          <Link className="button button--secondary" href="/shop">
            Continue Shopping
          </Link>
        </div>
      </article>
    </Container>
  );
}
