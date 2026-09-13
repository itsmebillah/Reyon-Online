import Link from "next/link";
import { Container } from "@/components/ui";
export const metadata = {
  title: "Returns & warranty",
  alternates: { canonical: "/returns" },
};
export default function Page() {
  return (
    <Container className="page">
      <article className="policy-copy">
        <p className="eyebrow">REYON WATCHES · EVERY DAY</p>
        <h1>Returns & warranty</h1>
        <section>
          <h2>Request a review</h2>
          <p>
            For a delivered order, the website accepts return requests within
            seven days of recorded delivery, subject to item eligibility and
            review. A submitted request is not an automatic refund approval. Use
            My orders from your checkout browser or contact REYON.
          </p>
        </section>
        <section>
          <h2>Wrong, damaged or defective items</h2>
          <p>
            Keep the packaging and supply a clear description and photo
            evidence. Contact support if you need help supplying evidence.
            Please do not ship an item back before receiving return
            instructions.
          </p>
        </section>
        <section>
          <h2>Condition and refunds</h2>
          <p>
            Ordinary returns depend on the item’s return eligibility and unused
            condition. Used items require an applicable exception review. Refund
            amount and shipping responsibility are determined through the return
            review; no instant refund is promised.
          </p>
        </section>
        <section>
          <h2>Watch warranty</h2>
          <p>
            Warranty coverage varies by model and provider. Only the coverage
            stated on the product page applies; if no coverage is listed, ask
            before ordering. A water-resistance rating is not a blanket
            guarantee against water damage. For warranty service after the
            return window, contact REYON with your order number.
          </p>
        </section>
        <Link className="button button--secondary" href="/contact">
          Contact REYON
        </Link>
      </article>
    </Container>
  );
}
