import Image from "next/image";
import { Container, LinkButton } from "@/components/ui";
export default function AboutPage() {
  return (
    <Container className="page">
      <div className="story">
        <div>
          <p className="eyebrow">Our story</p>
          <h1>A trusted destination for premium beauty and personal care.</h1>
          <p className="lead">
            REYON is a premium multi-brand beauty and personal care retailer,
            with authentic Korean beauty as one of our strongest specialties.
          </p>
          <p>
            We carefully select products from trusted beauty brands and present
            them with clarity, quality and transparency. Our platform supports a
            broad premium assortment while allowing our Korean beauty expertise
            to remain distinctive.
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
