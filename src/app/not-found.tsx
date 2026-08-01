import { Container, EmptyState, LinkButton } from "@/components/ui";
export default function NotFound() {
  return (
    <Container className="page">
      <EmptyState
        title="This page has wandered"
        body="The ritual you are looking for may have moved. Let us guide you back."
        action={<LinkButton href="/">Return home</LinkButton>}
      />
    </Container>
  );
}
