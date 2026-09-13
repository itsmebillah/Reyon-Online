import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Watch,
  Truck,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { Container } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { catalogRepository } from "@/features/catalog";
import { watchCategories } from "@/features/catalog/domain/watch";
export default async function Home() {
  const collections = await catalogRepository.listHomepageCollections();
  return (
    <>
      <section className="watch-hero">
        <Image
          src="/images/watch-hero.webp"
          alt="Editorial close-up of an unbranded steel watch with a midnight dial"
          fill
          priority
          sizes="100vw"
        />
        <Container>
          <div className="watch-hero-copy">
            <p className="eyebrow">REYON / WATCHES / EVERY DAY</p>
            <h1>
              Time, on
              <br />
              <em>your terms.</em>
            </h1>
            <p>
              For the everyday. For the occasion.
              <br />
              Find a watch that feels like you.
            </p>
            <Link className="button button--primary" href="/shop">
              Explore watches <ArrowUpRight size={18} />
            </Link>
            <span className="hero-caption">
              A considered collection. A simpler way to shop.
            </span>
          </div>
        </Container>
        <span className="hero-edition">THE WATCH EDIT — 01</span>
      </section>
      <div className="watch-service-strip">
        <span>
          <Truck size={18} /> Bangladesh delivery
        </span>
        <span>
          <Watch size={18} /> Specifications that matter
        </span>
        <span>
          <ShieldCheck size={18} /> COD at checkout
        </span>
      </div>
      <Container>
        <section className="watch-section">
          <div className="watch-section-heading">
            <div>
              <p className="eyebrow">FIND YOUR EVERYDAY</p>
              <h2>A style for every chapter.</h2>
            </div>
            <Link href="/shop">
              All watches <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="watch-category-grid">
            {watchCategories.map((c, i) => (
              <Link
                key={c.slug}
                href={"/shop?category=" + c.slug}
                className={"watch-category watch-category--" + i}
              >
                <span>0{i + 1} / THE COLLECTION</span>
                <Watch size={70} strokeWidth={0.7} />
                <h3>{c.name}</h3>
                <p>{c.description}</p>
                <ArrowUpRight className="category-arrow" />
              </Link>
            ))}
          </div>
          <div className="audience-links">
            <Link href="/shop?gender=men">Men’s watches ↗</Link>
            <Link href="/shop?gender=women">Women’s watches ↗</Link>
            <Link href="/shop?gender=unisex">Unisex watches ↗</Link>
          </div>
        </section>
        {collections
          .filter((c) => c.products.length > 0)
          .map((c) => (
            <section className="watch-section" key={c.key}>
              <div className="watch-section-heading">
                <div>
                  <p className="eyebrow">THE REYON SELECTION</p>
                  <h2>{c.name}</h2>
                </div>
                <Link
                  href={
                    c.key === "offers"
                      ? "/shop?offers=true"
                      : c.key === "best-sellers"
                        ? "/shop?sort=bestsellers"
                        : "/shop?sort=newest"
                  }
                >
                  Explore <ArrowUpRight size={16} />
                </Link>
              </div>
              <div className="product-grid">
                {c.products.map((p) => (
                  <ProductCard product={p} key={p.id} />
                ))}
              </div>
            </section>
          ))}
        {!collections.some((c) => c.products.length) && (
          <section className="watch-section collection-notice">
            <p className="eyebrow">THE NEXT CHAPTER</p>
            <h2>Our watch collection is taking shape.</h2>
            <p>
              We publish watches only when their details, photography and
              availability are confirmed. Speak to us about the watch you are
              looking for.
            </p>
            <Link className="button button--secondary" href="/contact">
              Talk to REYON
            </Link>
          </section>
        )}
        <section className="watch-editorial">
          <div>
            <p className="eyebrow">DETAILS MAKE THE DIFFERENCE</p>
            <h2>
              More than
              <br />a first impression.
            </h2>
            <p>
              Movement. Materials. Proportions. The right watch starts with the
              details that suit your day.
            </p>
            <Link href="/shop" className="button button--secondary">
              Find your watch <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="watch-trust">
            <article>
              <Watch />
              <h3>Know your watch</h3>
              <p>
                Compare the model, movement, case size and strap before
                choosing.
              </p>
            </article>
            <article>
              <ShieldCheck />
              <h3>Warranty, clearly explained</h3>
              <p>
                Coverage varies by watch. Read the product’s warranty
                information or ask us before ordering.
              </p>
            </article>
            <article>
              <Truck />
              <h3>Checkout made local</h3>
              <p>
                Prices in taka, Bangladesh addresses and delivery charges shown
                before confirmation.
              </p>
            </article>
            <article>
              <MessageCircle />
              <h3>A conversation away</h3>
              <p>
                Need help choosing? Reach REYON on WhatsApp for product and
                order questions.
              </p>
            </article>
          </div>
        </section>
        <section className="watch-section watch-faq">
          <p className="eyebrow">BEFORE YOU ORDER</p>
          <h2>A few things to know.</h2>
          <details>
            <summary>Can I pay Cash on Delivery?</summary>
            <p>
              COD is available when shown at checkout for your delivery
              selection. The full total is displayed before you place an order.
            </p>
          </details>
          <details>
            <summary>How much is delivery?</summary>
            <p>
              Select your district and delivery area at checkout to see the
              configured charge. No charge is hidden in the product price.
            </p>
          </details>
          <details>
            <summary>Does every watch have the same warranty?</summary>
            <p>
              No. Review each watch’s stated coverage. If a detail is not
              listed, please ask us before purchase.
            </p>
          </details>
          <details>
            <summary>Can I get help choosing a size?</summary>
            <p>
              Check the case diameter in the specifications and contact us if
              you would like more detail.
            </p>
          </details>
        </section>
      </Container>
    </>
  );
}
