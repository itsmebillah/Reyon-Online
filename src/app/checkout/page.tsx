import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { formatMoney } from "@/features/catalog";
import { getCartSummary } from "@/features/cart/actions";
import { AddressForm } from "./address-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PaymentMethods, type PaymentMethod } from "./payment-methods";
import { getCheckoutAddress } from "./actions";
import { getCheckoutOrderState } from "./actions";
import { DeliveryZoneForm, type DeliveryZone } from "./delivery-zone-form";
import { ConfirmOrderForm } from "./confirm-order-form";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const cart = await getCartSummary();
  if (!cart.items.length) redirect("/cart");
  const valid = cart.items.every((item) => item.isAvailable);
  const supabase = await createSupabaseServerClient();
  const [{ data: paymentData }, { data: zoneData }, address, orderState] =
    await Promise.all([
      supabase.rpc("checkout_payment_methods"),
      supabase.rpc("delivery_zones"),
      getCheckoutAddress(),
      getCheckoutOrderState(),
    ]);
  const paymentMethods = (paymentData ?? []) as PaymentMethod[];
  const deliveryZones = (zoneData ?? []) as DeliveryZone[];
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
          <AddressForm address={address} />
          {address ? (
            <DeliveryZoneForm
              zones={deliveryZones}
              selectedId={orderState?.deliveryZoneId ?? null}
            />
          ) : (
            <p className="checkout-step-notice">
              Save your delivery address to continue to delivery.
            </p>
          )}
          {orderState?.deliverySelected ? (
            <PaymentMethods
              methods={paymentMethods}
              selectedId={orderState.paymentMethodId}
            />
          ) : address ? (
            <p className="checkout-step-notice">
              Save a delivery zone to continue to payment.
            </p>
          ) : null}
          {orderState?.existingOrderId ? (
            <p className="admin-form-success" role="status">
              This checkout has already created order{" "}
              {orderState.existingOrderId}.
            </p>
          ) : orderState?.paymentSelected ? (
            <ConfirmOrderForm />
          ) : null}
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
              <dd>
                {orderState?.deliveryCharge != null
                  ? formatMoney({
                      amount: Number(orderState.deliveryCharge),
                      currency: orderState.currency,
                    })
                  : "Select a delivery zone"}
              </dd>
            </div>
            {orderState?.deliveryCharge != null && (
              <div>
                <dt>Total</dt>
                <dd>
                  {formatMoney({
                    amount:
                      Number(cart.subtotal) + Number(orderState.deliveryCharge),
                    currency: orderState.currency,
                  })}
                </dd>
              </div>
            )}
          </dl>
          {!valid && (
            <p className="cart-warning" role="alert">
              Your bag needs attention before checkout can continue.
            </p>
          )}
          {orderState?.paymentSelected ? (
            <a className="button button--primary" href="#payment-confirmation">
              Review payment
            </a>
          ) : orderState?.deliverySelected ? (
            <a className="button button--primary" href="#payment-method">
              Choose payment method
            </a>
          ) : address ? (
            <a className="button button--primary" href="#delivery-zone">
              Continue to delivery
            </a>
          ) : (
            <button className="button button--primary" disabled>
              Save address to continue
            </button>
          )}
          <p>No stock is reserved at this stage.</p>
        </aside>
      </div>
    </Container>
  );
}
