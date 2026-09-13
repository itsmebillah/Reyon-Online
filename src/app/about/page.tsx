import Link from "next/link";
import { Container } from "@/components/ui";
export const metadata = {
  title: "About REYON",
  alternates: { canonical: "/about" },
};
export default function Page() {
  return (
    <Container className="page">
      <article className="policy-copy">
        <p className="eyebrow">REYON WATCHES · EVERY DAY</p>
        <h1>About REYON</h1>
        <section>
          <h2>Time, on your terms.</h2>
          <p>
            REYON is a watch store for customers in Bangladesh. Our focus is
            straightforward: help you choose through clear specifications,
            useful photography and transparent prices.
          </p>
        </section>
        <section>
          <h2>Choose with the details in mind</h2>
          <p>
            Explore watches by style, movement, strap and case size. Read the
            individual product details for warranty and water-resistance
            information. If something is unclear, ask us before ordering.
          </p>
        </section>
        <section>
          <h2>A local shopping experience</h2>
          <p>
            Prices are shown in Bangladeshi taka. Checkout supports Bangladesh
            delivery addresses and the payment methods currently available for
            your order.
          </p>
        </section>
        <Link className="button button--secondary" href="/contact">
          Contact REYON
        </Link>
      </article>
    </Container>
  );
}
