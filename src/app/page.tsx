import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Container, LinkButton, SectionHeading } from "@/components/ui";
import { businessConfig } from "@/config/business";
import { categories, products } from "@/data/catalog";

export default function Home() {
  return (
    <>
      <section className="hero">
        <Image
          src="/images/hero-beauty-v2.png"
          alt="An unbranded premium beauty assortment arranged on warm travertine"
          fill
          priority
          sizes="100vw"
        />
        <Container>
          <div className="hero-copy">
            <p className="eyebrow">The REYON edit</p>
            <h1>
              Beauty,
              <br />
              <em>considered.</em>
            </h1>
            <p>
              Premium beauty and personal care from multiple brands, selected to
              make every choice feel clear and considered.
            </p>
            <div className="button-row">
              <LinkButton href="/shop">Explore the collection</LinkButton>
              <LinkButton href="/about" variant="secondary">
                Our philosophy
              </LinkButton>
            </div>
          </div>
        </Container>
      </section>
      <section className="section">
        <Container>
          <SectionHeading
            eyebrow="Shop with intention"
            title="Rituals for every day"
            body="A carefully structured collection designed to make discovering your next essential feel effortless."
          />
          <div className="category-grid">
            {categories.map((category, index) => (
              <Link
                className={`category-card category-card--${index + 1}`}
                href={`/shop?category=${encodeURIComponent(category)}`}
                key={category}
              >
                <span>0{index + 1}</span>
                <h3>{category}</h3>
                <p>Discover the edit →</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>
      <section className="section section--cream">
        <Container>
          <SectionHeading eyebrow="The essentials" title="Most loved" />
          <div className="product-grid">
            {products.map((product, index) => (
              <ProductCard
                key={product.slug}
                product={product}
                priority={index < 2}
              />
            ))}
          </div>
          <div className="center">
            <LinkButton href="/shop" variant="secondary">
              View all products
            </LinkButton>
          </div>
        </Container>
      </section>
      <section className="promise">
        <Container>
          <p className="eyebrow">Our promise</p>
          <blockquote>
            “Beauty should feel clear, personal and quietly exceptional.”
          </blockquote>
          <div className="promise-grid">
            <div>
              <span>01</span>
              <h3>Considered selection</h3>
              <p>A calm, edited experience—not endless choice.</p>
            </div>
            <div>
              <span>02</span>
              <h3>Clarity first</h3>
              <p>Information that helps you decide with confidence.</p>
            </div>
            <div>
              <span>03</span>
              <h3>Care in every detail</h3>
              <p>From discovery to delivery, every moment matters.</p>
            </div>
          </div>
        </Container>
      </section>
      <section className="section">
        <Container>
          <div className="editorial">
            <div>
              <p className="eyebrow">A quieter approach</p>
              <h2>
                Less noise.
                <br />
                More intention.
              </h2>
              <p>
                REYON is being built as a trusted home for beauty and care—where
                technology disappears into an experience that feels simple, warm
                and human.
              </p>
              <LinkButton href="/about">Discover REYON</LinkButton>
            </div>
            <Image
              src="/images/product-serum.png"
              alt="Minimal serum bottle on a natural stone pedestal"
              width={800}
              height={800}
            />
          </div>
        </Container>
      </section>
      <section className="reviews section--cream">
        <Container>
          <SectionHeading
            eyebrow="Built around trust"
            title="A clearer way to shop beauty"
          />
          <div className="review-grid">
            {[
              [
                "Multi-brand selection",
                "Beauty and care across six essential categories.",
              ],
              [
                "Clear information",
                "Straightforward presentation designed to support confident choices.",
              ],
              [
                "Human support",
                "Direct access to REYON through its approved customer channels.",
              ],
            ].map(([title, body]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>
      <section className="instagram">
        <Container>
          <p className="eyebrow">Follow the ritual</p>
          <h2>
            <a href={businessConfig.contact.instagramUrl}>@reyononline.bd</a>
          </h2>
          <div className="instagram-grid">
            {[1, 2, 3, 4].map((item) => (
              <div key={item}>
                <Image
                  src="/images/product-serum.png"
                  alt="Minimal beauty editorial study"
                  fill
                  sizes="25vw"
                />
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
