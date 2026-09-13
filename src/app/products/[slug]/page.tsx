import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/store-actions";
import { WatchGallery } from "@/components/watch-gallery";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/ui";
import { catalogRepository } from "@/features/catalog";
import { watchFields } from "@/features/catalog/domain/watch";
import { businessConfig } from "@/config/business";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await catalogRepository.getProductBySlug(slug);
  return p
    ? {
        title: p.brand.name + " " + p.name + " | REYON Watches",
        description:
          p.content.summary ||
          p.name + " ï¿½ specifications, materials and availability at REYON.",
        alternates: { canonical: "/products/" + slug },
        openGraph: {
          title: p.name,
          images: [{ url: p.media.src, alt: p.media.alt }],
        },
      }
    : {};
}
export default async function Product({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await catalogRepository.getProductBySlug(slug);
  if (!p) notFound();
  const related = (
    await catalogRepository.listProducts({
      category: p.category.slug,
      limit: 5,
    })
  )
    .filter((r) => r.id !== p.id)
    .slice(0, 4);
  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.content.summary,
    image: (p.gallery ?? [p.media]).map((m) => m.src),
    brand: { "@type": "Brand", name: p.brand.name },
    model: p.specifications?.model,
    sku: p.variant.sku,
    offers: (p.variants ?? []).map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      priceCurrency: "BDT",
      price: v.price,
      availability:
        "https://schema.org/" + (v.available > 0 ? "InStock" : "OutOfStock"),
      url: businessConfig.productionUrl + "/products/" + p.slug,
    })),
  };
  return (
    <Container className="page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, "\u003c"),
        }}
      />
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/shop">Watches</Link>
        <span>/</span>
        <Link href={"/shop?category=" + p.category.slug}>
          {p.category.name}
        </Link>
        <span>/</span>
        <span>{p.name}</span>
      </nav>
      <div className="watch-product-layout">
        <WatchGallery images={p.gallery?.length ? p.gallery : [p.media]} />
        <div className="watch-product-detail">
          <p className="eyebrow">{p.brand.name}</p>
          <h1>{p.name}</h1>
          <p className="lead">{p.content.summary}</p>
          <ProductActions product={p} />
          <div className="product-assurance">
            <p>Cash on Delivery when available at checkout</p>
            <p>Delivery charge shown before order confirmation</p>
            <p>
              {p.specifications?.warranty ||
                "Warranty details: contact us before ordering."}
            </p>
          </div>
          <Link href="/contact">Need a closer look? Ask REYON ↗</Link>
        </div>
      </div>
      <section className="watch-section">
        <p className="eyebrow">KNOW YOUR WATCH</p>
        <h2>The details.</h2>
        <dl className="watch-specifications">
          {Object.entries(watchFields).map(([key, label]) => {
            const value = p.specifications?.[key as keyof typeof watchFields];
            return value ? (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ) : null;
          })}
        </dl>
        <p className="muted">
          Water resistance is a manufacturer rating, not a guarantee for every
          activity. Check the model’s instructions before exposure to water.
        </p>
      </section>
      {related.length > 0 && (
        <section className="watch-section">
          <h2>Also worth your time.</h2>
          <div className="product-grid">
            {related.map((r) => (
              <ProductCard product={r} key={r.id} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
