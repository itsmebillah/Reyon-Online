import { Container, EmptyState, LinkButton } from "@/components/ui";
export default function NotFound() {
  return (
    <Container className="page">
      <EmptyState
        title="This page has wandered"
        body="This page may have moved. Explore our watch collection."
        action={<LinkButton href="/">Return home</LinkButton>}
      />
    </Container>
  );
}
