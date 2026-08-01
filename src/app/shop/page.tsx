import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { Container, SectionHeading } from "@/components/ui";
import { categories, products } from "@/data/catalog";
export const metadata: Metadata = {
  title: "Shop",
  description:
    "Explore authentic Korean beauty and personal care products from trusted brands at REYON.",
  alternates: { canonical: "/shop" },
};
export default function ShopPage() {
  return (
    <Container className="page">
      <SectionHeading
        eyebrow="Authentic K-Beauty"
        title="Shop Korean beauty"
        body="Genuine skincare, haircare, makeup and personal care from trusted brands, carefully selected by REYON."
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
