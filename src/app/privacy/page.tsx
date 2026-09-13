import Link from "next/link";
import { Container } from "@/components/ui";
export const metadata = {
  title: "Privacy notice",
  alternates: { canonical: "/privacy" },
};
export default function Page() {
  return (
    <Container className="page">
      <article className="policy-copy">
        <p className="eyebrow">REYON WATCHES · BANGLADESH</p>
        <h1>Privacy notice</h1>
        <section>
          <h2>Information used for orders</h2>
          <p>
            Checkout records your name, mobile number, delivery address,
            optional notes, purchased items, payment method and any submitted
            payment reference. Aftercare may record your request and supporting
            evidence.
          </p>
        </section>
        <section>
          <h2>How it is used</h2>
          <p>
            REYON uses these details to process orders, arrange delivery, review
            payment, provide support and maintain operational records. Relevant
            contact and delivery details may be shared with the delivery handler
            assigned to your order.
          </p>
        </section>
        <section>
          <h2>Storage and browser cookies</h2>
          <p>
            The website uses Supabase for database and administrator
            authentication services and Vercel for hosting. Essential browser
            cookies retain your shopping bag and private access to your latest
            order. Treat access to your checkout browser as private.
          </p>
        </section>
        <section>
          <h2>Retention and requests</h2>
          <p>
            Order and financial evidence is retained for operational and
            record-keeping needs. Contact REYON to request access, correction or
            deletion; some historical records may need to be retained. Do not
            send passwords, PINs or full card information to support.
          </p>
        </section>
        <Link className="button button--secondary" href="/contact">
          Contact REYON
        </Link>
      </article>
    </Container>
  );
}
