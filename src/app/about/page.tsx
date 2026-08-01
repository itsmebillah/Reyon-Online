import Image from "next/image";
import { Container, LinkButton } from "@/components/ui";
export default function AboutPage() {
  return (
    <Container className="page">
      <div className="story">
        <div>
          <p className="eyebrow">Our story</p>
          <h1>A trusted destination for authentic Korean beauty.</h1>
          <p className="lead">
            REYON is a premium multi-brand retailer specializing in genuine
            Korean skincare, haircare, makeup and personal care.
          </p>
          <p>
            We carefully select products from trusted beauty brands and present
            them with clarity, quality and transparency. Korean beauty is our
            primary focus, with carefully selected international brands planned
            for the future.
          </p>
          <LinkButton href="/shop">Explore REYON</LinkButton>
        </div>
        <Image
          src="/images/hero-beauty.png"
          alt="REYON's warm, minimal beauty aesthetic"
          width={1000}
          height={700}
        />
      </div>
    </Container>
  );
}
