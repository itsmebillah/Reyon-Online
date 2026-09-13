import Link from "next/link";
import { Container } from "@/components/ui";
export const metadata = {
  title: "Shopping terms",
  alternates: { canonical: "/terms" },
};
export default function Page() {
  return (
    <Container className="page">
      <article className="policy-copy">
        <p className="eyebrow">REYON WATCHES · BANGLADESH</p>
        <h1>Shopping terms</h1>
        <section>
          <h2>Product information</h2>
          <p>
            Review the specific model, variant, price, availability and warranty
            before ordering. Editorial imagery is illustrative; product
            galleries describe the listed watch. If any information is unclear,
            contact REYON first.
          </p>
        </section>
        <section>
          <h2>Prices and confirmation</h2>
          <p>
            Prices are in BDT. Checkout rechecks price and stock and shows the
            delivery charge before confirmation. Availability may change while
            browsing. Keep the order reference shown after checkout.
          </p>
        </section>
        <section>
          <h2>Payment and fulfillment</h2>
          <p>
            Payment methods are limited to those enabled at checkout. Manual
            payment references require verification and are not proof of
            successful payment by themselves. Courier status reflects recorded
            operational updates.
          </p>
        </section>
        <section>
          <h2>Changes and aftercare</h2>
          <p>
            Before shipment, request a cancellation or correction through My
            orders or support. After shipment, use the return review process.
            See Returns & warranty for the current website process.
          </p>
        </section>
        <section>
          <h2>Contact</h2>
          <p>
            Contact REYON through the email or WhatsApp details on the Contact
            page for questions, complaints and order assistance.
          </p>
        </section>
        <Link className="button button--secondary" href="/contact">
          Contact REYON
        </Link>
      </article>
    </Container>
  );
}
