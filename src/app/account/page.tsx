import { Container, EmptyState, LinkButton } from "@/components/ui";
export default function Account() {
  return (
    <Container className="page">
      <EmptyState
        title="Your REYON space"
        body="Profiles and personal rituals will arrive when authentication is approved."
        action={<LinkButton href="/shop">Continue shopping</LinkButton>}
      />
    </Container>
  );
}
