import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/store-actions";
import { Container } from "@/components/ui";
import { formatPrice, products } from "@/data/catalog";
export function generateStaticParams() {
  return products.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = products.find((x) => x.slug === slug);
  return p
    ? {
        title: p.name,
        description: p.description,
        alternates: { canonical: `/products/${slug}` },
      }
    : {};
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = products.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <Container className="product-page">
      <div className="product-gallery">
        <Image
          src="/images/product-serum.png"
          alt={`Unbranded serum representing ${p.name}`}
          fill
          priority
          sizes="(max-width: 800px) 100vw, 55vw"
        />
      </div>
      <div className="product-detail">
        <p className="eyebrow">{p.brand}</p>
        <h1>{p.name}</h1>
        <p className="price price--large">
          {formatPrice(p.price)}{" "}
          {p.compareAt && <del>{formatPrice(p.compareAt)}</del>}
        </p>
        <p className="lead">{p.description}</p>
        <p className="muted">
          {p.size} · {p.stock}
        </p>
        <ProductActions product={p} />
        <div className="accordions">
          <details open>
            <summary>Why it belongs in your ritual</summary>
            <p>
              Designed as a premium product-detail foundation. Approved product
              benefits will replace this neutral interface copy when supplied.
            </p>
          </details>
          <details>
            <summary>How to use</summary>
            <p>
              Usage information will appear only after approved product data is
              available.
            </p>
          </details>
          <details>
            <summary>Delivery &amp; care</summary>
            <p>
              Delivery policies will be connected when business rules are
              approved.
            </p>
          </details>
        </div>
      </div>
    </Container>
  );
}
