import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { Container, SectionHeading } from "@/components/ui";
import { categories, products } from "@/data/catalog";
export const metadata: Metadata = {
  title: "Shop",
  description: "Explore the considered REYON Beauty & Care collection.",
  alternates: { canonical: "/shop" },
};
export default function ShopPage() {
  return (
    <Container className="page">
      <SectionHeading
        eyebrow="The collection"
        title="Shop all beauty"
        body="Considered essentials, presented with clarity."
      />
      <div className="shop-toolbar">
        <p>{products.length} products</p>
        <div>
          <label htmlFor="category">Category</label>
          <select id="category" defaultValue="all">
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label htmlFor="sort">Sort</label>
          <select id="sort">
            <option>Featured</option>
            <option>Newest</option>
            <option>Price: low to high</option>
          </select>
        </div>
      </div>
      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </Container>
  );
}
