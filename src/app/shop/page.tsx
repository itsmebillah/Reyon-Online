import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Container, EmptyState, LinkButton } from "@/components/ui";
import {
  catalogRepository,
  type CatalogQuery,
  type CatalogSort,
} from "@/features/catalog";
export const metadata: Metadata = {
  title: "Shop watches in Bangladesh",
  description:
    "Explore watches by brand, movement, strap, price and style. Shop REYON in BDT with Cash on Delivery.",
  alternates: { canonical: "/shop" },
};
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(p.page ?? "1", 10) || 1),
  );
  const numeric = (s?: string) =>
    s && Number.isFinite(Number(s)) && Number(s) >= 0 ? Number(s) : undefined;
  const sort: CatalogSort =
    (["newest", "price-asc", "price-desc", "bestsellers"] as const).find(
      (s) => s === p.sort,
    ) ?? "featured";
  const q: CatalogQuery = {
    category: p.category,
    brand: p.brand,
    gender: p.gender,
    movement: p.movement,
    strap: p.strap,
    search: p.q,
    min: numeric(p.min),
    max: numeric(p.max),
    available: p.available === "true",
    offers: p.offers === "true",
    sort,
    page,
    limit: 25,
  };
  const [all, categories, brands] = await Promise.all([
    catalogRepository.listProducts(q),
    catalogRepository.listCategories(),
    catalogRepository.listBrands(),
  ]);
  const products = all.slice(0, 24);
  const pageUrl = (n: number) => {
    const u = new URLSearchParams(
      Object.entries(p).filter(
        (e): e is [string, string] => typeof e[1] === "string",
      ),
    );
    u.set("page", String(n));
    return "/shop?" + u.toString();
  };
  return (
    <Container className="page watch-shop">
      <header className="watch-page-heading">
        <p className="eyebrow">THE WATCH COLLECTION</p>
        <h1>Find your kind of time.</h1>
        <p>Explore by style, movement and the details that matter to you.</p>
      </header>
      <form className="watch-filters" method="get" role="search">
        <label className="filter-search">
          Search
          <input
            type="search"
            name="q"
            defaultValue={p.q}
            placeholder="Brand, model or watch"
            maxLength={100}
          />
        </label>
        <label>
          Category
          <select name="category" defaultValue={p.category ?? ""}>
            <option value="">All styles</option>
            {categories.map((c) => (
              <option value={c.slug} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Brand
          <select name="brand" defaultValue={p.brand ?? ""}>
            <option value="">All brands</option>
            {brands.map((b) => (
              <option value={b.slug} key={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Gender
          <select name="gender" defaultValue={p.gender ?? ""}>
            <option value="">Everyone</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
          </select>
        </label>
        <label>
          Movement
          <select name="movement" defaultValue={p.movement ?? ""}>
            <option value="">All movements</option>
            {["Quartz", "Automatic", "Mechanical", "Solar", "Digital"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Strap
          <select name="strap" defaultValue={p.strap ?? ""}>
            <option value="">All materials</option>
            {["Leather", "Stainless steel", "Silicone", "Resin", "Nylon"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Minimum ৳
          <input
            type="number"
            name="min"
            min="0"
            defaultValue={p.min}
            placeholder="0"
          />
        </label>
        <label>
          Maximum ৳
          <input
            type="number"
            name="max"
            min="0"
            defaultValue={p.max}
            placeholder="Any price"
          />
        </label>
        <label>
          Sort
          <select name="sort" defaultValue={sort}>
            <option value="featured">Recommended</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="bestsellers">Best sellers</option>
          </select>
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            name="available"
            value="true"
            defaultChecked={q.available}
          />{" "}
          In stock
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            name="offers"
            value="true"
            defaultChecked={q.offers}
          />{" "}
          Offers
        </label>
        <button className="button button--primary">Apply filters</button>
        <Link href="/shop">Clear filters</Link>
      </form>
      <p className="catalog-count">{products.length} watches on this page</p>
      {products.length ? (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No watches found"
          body="Try different filters, or contact us about the watch you’re looking for."
          action={<LinkButton href="/contact">Ask REYON</LinkButton>}
        />
      )}
      <nav className="pagination" aria-label="Catalog pages">
        {page > 1 && <Link href={pageUrl(page - 1)}>← Previous</Link>}
        <span>Page {page}</span>
        {all.length > 24 && <Link href={pageUrl(page + 1)}>Next →</Link>}
      </nav>
    </Container>
  );
}
