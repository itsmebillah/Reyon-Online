import Image from "next/image";
import { Container, LinkButton } from "@/components/ui";
export default function AboutPage() {
  return (
    <Container className="page">
      <div className="story">
        <div>
          <p className="eyebrow">Our story</p>
          <h1>A more thoughtful way to discover beauty.</h1>
          <p className="lead">
            REYON is a Beauty &amp; Care destination being built around clarity,
            trust and personal ritual.
          </p>
          <p>
            We believe premium is not excess. It is the feeling that every
            detail has been considered: less noise, clearer choices and care
            that carries through every interaction.
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
