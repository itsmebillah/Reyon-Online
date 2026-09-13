export const metadata = {
  title: "My orders",
  robots: { index: false, follow: false },
  alternates: { canonical: "/account" },
};
import { Container, EmptyState, LinkButton } from "@/components/ui";
import { CancelOrderForm } from "./cancel-order-form";
import { ResubmitPaymentForm } from "./resubmit-payment-form";
import { OrderChangeForm } from "./order-change-form";
import { SalesDocumentForm } from "./sales-document-form";
import { DeliveryStatusForm } from "./delivery-status-form";
import { ReturnRequestForm } from "./return-request-form";
export default function Account() {
  return (
    <Container className="page">
      <EmptyState
        title="Your orders & aftercare"
        body="For your privacy, use the same browser where you placed your most recent order. Keep your order number handy. For older orders or another device, contact REYON on WhatsApp."
        action={<LinkButton href="/shop">Continue shopping</LinkButton>}
      />
      <section className="admin-module-card">
        <span>Order tracking</span>
        <h2>Track your delivery</h2>
        <p>
          See REYON&apos;s recorded shipment status and reference. Live courier
          location tracking is not currently provided.
        </p>
        <DeliveryStatusForm />
      </section>
      <section className="admin-module-card">
        <span>Within seven days of delivery</span>
        <h2>Request a product return</h2>
        <p>
          Check eligible items first. Exception claims require photo evidence.
        </p>
        <ReturnRequestForm />
      </section>
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
        <span>Order support</span>
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
