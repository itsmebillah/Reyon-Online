import { ProductCard } from "@/components/product-card";
import { Container, EmptyState, LinkButton } from "@/components/ui";
import { products } from "@/data/catalog";
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = (await searchParams).q?.trim() ?? "";
  const matches = q
    ? products.filter((p) =>
        `${p.brand} ${p.name} ${p.category}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
    : [];
  return (
    <Container className="page">
      <p className="eyebrow">Search REYON</p>
      <h1>{q ? `Results for “${q}”` : "What are you looking for?"}</h1>
      {matches.length ? (
        <div className="product-grid">
          {matches.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No products found"
          body="Try a broader search or explore the full collection."
          action={<LinkButton href="/shop">Explore the collection</LinkButton>}
        />
      )}
    </Container>
  );
}
