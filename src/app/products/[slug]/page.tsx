import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/store-actions";
import { Container } from "@/components/ui";
import { catalogRepository, formatMoney } from "@/features/catalog";
export function generateStaticParams() {
  return catalogRepository.listProducts().map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = catalogRepository.getProductBySlug(slug);
  return p
    ? {
        title: p.name,
        description: p.content.summary,
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
  const p = catalogRepository.getProductBySlug(slug);
  if (!p) notFound();
  return (
    <Container className="product-page">
      <div className="product-gallery">
        <Image
          src={p.media.src}
          alt={p.media.alt}
          fill
          priority
          sizes="(max-width: 800px) 100vw, 55vw"
        />
      </div>
      <div className="product-detail">
        <p className="eyebrow">{p.brand.name}</p>
        <h1>{p.name}</h1>
        <p className="price price--large">
          {formatMoney(p.offer.price)}{" "}
          {p.offer.compareAtPrice && (
            <del>{formatMoney(p.offer.compareAtPrice)}</del>
          )}
        </p>
        <p className="lead">{p.content.summary}</p>
        <p className="muted">
          {p.variant.label} · {p.offer.availabilityLabel}
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
