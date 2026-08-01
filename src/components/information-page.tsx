import { Container } from "./ui";
export function InformationPage({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <Container className="page">
      <div className="section-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <p className="lead">
        This customer-facing foundation is ready for the Product Owner’s
        approved policy. No operational promise is presented before the business
        rule exists.
      </p>
    </Container>
  );
}
