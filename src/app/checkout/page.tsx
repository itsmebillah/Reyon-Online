import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { formatMoney } from "@/features/catalog";
import { getCartSummary } from "@/features/cart/actions";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await getCartSummary();
  if (!cart.items.length) redirect("/cart");
  const valid = cart.items.every((item) => item.isAvailable);
  return (
    <Container className="page checkout-page">
      <header className="checkout-header">
        <p className="eyebrow">Secure checkout</p>
        <h1>Review your bag</h1>
        <p>
          Current prices and stock are checked directly before you continue.
        </p>
      </header>
      <div className="checkout-layout">
        <section className="checkout-review" aria-labelledby="review-title">
          <h2 id="review-title">Items</h2>
          {cart.items.map((item) => (
            <article key={item.variantId}>
              <Image
                src={item.imageUrl}
                alt={item.imageAlt}
                width={76}
                height={92}
                unoptimized={item.imageUrl.startsWith("http")}
              />
              <div>
                <strong>{item.name}</strong>
                <small>
                  {item.variantLabel} · Quantity {item.quantity}
                </small>
                {!item.isAvailable && (
                  <span>
                    Stock changed — return to your bag to update this item.
                  </span>
                )}
              </div>
              <strong>
                {formatMoney({
                  amount: Number(item.lineTotal),
                  currency: "BDT",
                })}
              </strong>
            </article>
          ))}
          <Link className="checkout-edit" href="/cart">
            Edit shopping bag
          </Link>
        </section>
        <aside className="cart-summary checkout-summary">
          <p className="eyebrow">Checkout summary</p>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>
                {formatMoney({
                  amount: Number(cart.subtotal),
                  currency: "BDT",
                })}
              </dd>
            </div>
            <div>
              <dt>Delivery</dt>
              <dd>Calculated after address</dd>
            </div>
          </dl>
          {!valid && (
            <p className="cart-warning" role="alert">
              Your bag needs attention before checkout can continue.
            </p>
          )}
          <button className="button button--primary" disabled>
            Customer details are the next step
          </button>
          <p>No stock is reserved at this stage.</p>
        </aside>
      </div>
    </Container>
  );
}
