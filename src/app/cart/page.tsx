import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container, EmptyState } from "@/components/ui";
import { formatMoney } from "@/features/catalog";
import { getCartSummary } from "@/features/cart/actions";
import { CartQuantityForm } from "./cart-quantity-form";
import { CheckoutLink } from "./checkout-link";

export const metadata: Metadata = { title: "Shopping Bag" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await getCartSummary();
  return (
    <Container className="page cart-page">
      <header className="cart-page__header">
        <p className="eyebrow">Your selection</p>
        <h1>Shopping bag</h1>
        <p>
          {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
        </p>
      </header>
      {!cart.items.length ? (
        <EmptyState
          title="Your bag is empty"
          body="Discover authentic beauty and personal care selected by REYON."
          action={
            <Link className="button button--primary" href="/shop">
              Continue shopping
            </Link>
          }
        />
      ) : (
        <div className="cart-layout">
          <section className="cart-lines" aria-label="Shopping bag items">
            {cart.items.map((item) => (
              <article className="cart-line" key={item.variantId}>
                <Image
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  width={140}
                  height={170}
                  unoptimized={item.imageUrl.startsWith("http")}
                />
                <div>
                  <p className="product-brand">{item.brandName}</p>
                  <h2>
                    <Link href={`/products/${item.slug}`}>{item.name}</Link>
                  </h2>
                  <p className="muted">
                    {item.variantLabel} · {item.sku}
                  </p>
                  {!item.isAvailable && (
                    <p className="cart-warning">
                      Only {item.available} currently available. Review before
                      checkout.
                    </p>
                  )}
                </div>
                <CartQuantityForm
                  variantId={item.variantId}
                  quantity={item.quantity}
                />
                <strong>
                  {formatMoney({
                    amount: Number(item.lineTotal),
                    currency: "BDT",
                  })}
                </strong>
              </article>
            ))}
          </section>
          <aside className="cart-summary">
            <p className="eyebrow">Order summary</p>
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
                <dd>Calculated at checkout</dd>
              </div>
            </dl>
            <p>
              Prices and stock are revalidated before confirmation. Items in
              your bag are not reserved.
            </p>
            <CheckoutLink />
          </aside>
        </div>
      )}
    </Container>
  );
}
