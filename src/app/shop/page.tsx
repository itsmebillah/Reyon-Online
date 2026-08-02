import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import {
  Container,
  EmptyState,
  LinkButton,
  SectionHeading,
} from "@/components/ui";
import { catalogRepository, type CatalogSort } from "@/features/catalog";
export const metadata: Metadata = {
  title: "Shop",
  description:
    "Explore premium multi-brand beauty and personal care at REYON, including our authentic Korean beauty specialization.",
  alternates: { canonical: "/shop" },
};
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const categories = await catalogRepository.listCategories();
  const sort: CatalogSort =
    params.sort === "new" || params.sort === "newest"
      ? "newest"
      : params.sort === "price-asc"
        ? "price-asc"
        : "featured";
  const products = await catalogRepository.listProducts({
    category: params.category,
    sort,
  });
  return (
    <Container className="page">
      <SectionHeading
        eyebrow="Carefully selected collections"
        title="Shop beauty & personal care"
        body="Premium products from trusted brands across beauty and personal care, including a strong authentic K-Beauty specialization."
      />
      <div className="shop-toolbar">
        <p>{products.length} products</p>
        <form method="get">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            defaultValue={params.category ?? ""}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <label htmlFor="sort">Sort</label>
          <select id="sort" name="sort" defaultValue={sort}>
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
          </select>
          <button className="button button--secondary" type="submit">
            Apply
          </button>
        </form>
      </div>
      {products.length ? (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No products in this collection"
          body="Explore all categories while this collection is being prepared."
          action={<LinkButton href="/shop">View all products</LinkButton>}
        />
      )}
    </Container>
  );
}
