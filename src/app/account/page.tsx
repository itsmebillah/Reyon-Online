import { Container, EmptyState, LinkButton } from "@/components/ui";
import { CancelOrderForm } from "./cancel-order-form";
export default function Account() {
  return (
    <Container className="page">
      <EmptyState
        title="Your REYON space"
        body="Your customer profile is created securely when you place an order. OTP verification is deferred and does not prevent checkout in the current release."
        action={<LinkButton href="/shop">Continue shopping</LinkButton>}
      />
      <section className="admin-module-card">
        <span>Before shipment</span>
        <h2>Request order cancellation</h2>
        <p>After shipment, order changes move to the return workflow.</p>
        <CancelOrderForm />
      </section>
    </Container>
  );
}
