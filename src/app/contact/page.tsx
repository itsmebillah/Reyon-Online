import { Container } from "@/components/ui";
import { businessConfig } from "@/config/business";
export const metadata = {
  title: "Contact REYON",
  description: "Ask REYON about watches, delivery, orders or warranty.",
  alternates: { canonical: "/contact" },
};
export default function Contact() {
  return (
    <Container className="page">
      <article className="policy-copy">
        <p className="eyebrow">LET’S TALK WATCHES</p>
        <h1>A conversation away.</h1>
        <p>
          Choosing a watch, checking a specification or following up on an
          order? Get in touch with REYON.
        </p>
        <div className="button-row">
          <a
            className="button button--primary"
            href={businessConfig.contact.whatsappUrl}
          >
            Chat on WhatsApp ↗
          </a>
          <a
            className="button button--secondary"
            href={"mailto:" + businessConfig.contact.email}
          >
            Email us ↗
          </a>
        </div>
        <h2>For order support</h2>
        <p>
          Include your order number and the mobile number used at checkout.
          Never send payment PINs, passwords or full card details.
        </p>
        <address>
          <a href={"mailto:" + businessConfig.contact.email}>
            {businessConfig.contact.email}
          </a>
          <br />
          {businessConfig.contact.whatsappDisplay}
        </address>
      </article>
    </Container>
  );
}
