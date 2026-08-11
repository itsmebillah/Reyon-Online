import { Container, EmptyState, LinkButton } from "@/components/ui";
export default function Account() {
  return (
    <Container className="page">
      <EmptyState
        title="Your REYON space"
        body="Your account is created securely during checkout and linked after phone verification. Email may be used as a fallback when provided."
        action={<LinkButton href="/shop">Continue shopping</LinkButton>}
      />
    </Container>
  );
}
