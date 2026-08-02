import type { Metadata } from "next";
import { getProductOptions } from "@/features/catalog/data/product-management";
import { ProductForm } from "./product-form";
import { publishProduct } from "./actions";
export const metadata: Metadata = {
  title: "Product Management",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function ProductsPage() {
  const data = await getProductOptions();
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="products-title"
    >
      <header>
        <p className="eyebrow">Catalog operations</p>
        <h1 id="products-title">Product Management</h1>
        <p>
          Create the product, first variant, prices, and primary image in one
          guided workflow. Published products appear on the customer website
          immediately.
        </p>
      </header>
      <article className="admin-module-card catalog-product-card">
        <span>New product</span>
        <h2>Create a product</h2>
        <ProductForm brands={data.brands} categories={data.categories} />
      </article>
      <article className="admin-module-card">
        <span>Catalog</span>
        <h2>Products</h2>
        {data.products.length ? (
          <div className="admin-product-list">
            {data.products.map((product) => (
              <div key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <small>
                    {product.brand} · {product.category}
                  </small>
                </div>
                <div className="product-status-actions">
                  <span
                    className={`status-pill status-pill--${product.status}`}
                  >
                    {product.status}
                  </span>
                  {["draft", "review", "approved"].includes(product.status) && (
                    <form action={publishProduct}>
                      <input
                        type="hidden"
                        name="productId"
                        value={product.id}
                      />
                      <input type="hidden" name="slug" value={product.slug} />
                      <button className="button button--secondary">
                        Publish
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No operational products yet. Create the first product above.</p>
        )}
      </article>
    </section>
  );
}
