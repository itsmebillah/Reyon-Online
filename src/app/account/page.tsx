import { Container, EmptyState, LinkButton } from "@/components/ui";
export default function Account() {
  return (
    <Container className="page">
      <EmptyState
        title="Your REYON space"
        body="Your customer profile is created securely when you place an order. OTP verification is deferred and does not prevent checkout in the current release."
        action={<LinkButton href="/shop">Continue shopping</LinkButton>}
      />
    </Container>
  );
}
