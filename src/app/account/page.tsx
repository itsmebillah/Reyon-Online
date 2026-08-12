import { Container, EmptyState, LinkButton } from "@/components/ui";
import { CancelOrderForm } from "./cancel-order-form";
import { ResubmitPaymentForm } from "./resubmit-payment-form";
import { OrderChangeForm } from "./order-change-form";
import { SalesDocumentForm } from "./sales-document-form";
export default function Account() {
  return (
    <Container className="page">
      <EmptyState
        title="Your REYON space"
        body="Your customer profile is created securely when you place an order. OTP verification is deferred and does not prevent checkout in the current release."
        action={<LinkButton href="/shop">Continue shopping</LinkButton>}
      />
      <section className="admin-module-card">
        <span>Completed sales</span>
        <h2>Invoice & payment receipts</h2>
        <p>
          View the customer invoice for a completed order and any separate
          payment receipt issued when payment was verified or collected.
        </p>
        <SalesDocumentForm />
      </section>
      <section className="admin-module-card">
        <span>Before shipment</span>
        <h2>Request order cancellation</h2>
        <p>After shipment, order changes move to the return workflow.</p>
        <CancelOrderForm />
      </section>
      <section className="admin-module-card">
        <span>Manual payment</span>
        <h2>Correct rejected payment evidence</h2>
        <ResubmitPaymentForm />
      </section>
      <section className="admin-module-card">
        <span>Append-only request</span>
        <h2>Request a correction or return</h2>
        <p>
          After shipment, requests enter the Return/Refund workflow. Existing
          order history is never overwritten.
        </p>
        <OrderChangeForm />
      </section>
    </Container>
  );
}
