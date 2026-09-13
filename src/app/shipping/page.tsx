import Link from "next/link";
import { Container } from "@/components/ui";
export const metadata = {
  title: "Delivery & payment",
  alternates: { canonical: "/shipping" },
};
export default function Page() {
  return (
    <Container className="page">
      <article className="policy-copy">
        <p className="eyebrow">REYON WATCHES · EVERY DAY</p>
        <h1>Delivery & payment</h1>
        <section>
          <h2>Delivery charges</h2>
          <p>
            Save your district and full address at checkout to see the
            configured delivery charge. The current zones distinguish Dhaka
            district from other Bangladesh districts. An unavailable zone cannot
            be used to place an order.
          </p>
        </section>
        <section>
          <h2>Before confirmation</h2>
          <p>
            Review your address, product quantities and final total. Delivery
            timing is not guaranteed by this website; contact REYON for the
            current estimate for your area before ordering.
          </p>
        </section>
        <section>
          <h2>Cash on Delivery and manual payments</h2>
          <p>
            COD is available when shown at checkout. Mobile payment methods, if
            enabled, display instructions and require a reference for manual
            review. Selecting a method or submitting a reference does not
            establish that payment was received. We do not collect card details.
          </p>
        </section>
        <section>
          <h2>Tracking</h2>
          <p>
            Use My orders in the browser used at checkout to view the shipment
            status recorded by REYON. This is not live courier-location
            tracking. For delivery changes, contact support with your order
            number.
          </p>
        </section>
        <Link className="button button--secondary" href="/contact">
          Contact REYON
        </Link>
      </article>
    </Container>
  );
}
