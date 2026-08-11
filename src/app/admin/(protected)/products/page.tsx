import type { Metadata } from "next";
import { getProductOptions } from "@/features/catalog/data/product-management";
import { ProductForm } from "./product-form";
import { transitionProduct } from "./actions";

export const metadata: Metadata = {
  title: "Product Management",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const lifecycleAction: Readonly<
  Record<string, Readonly<{ target: string; label: string }>>
> = {
  draft: { target: "review", label: "Submit for review" },
  review: { target: "approved", label: "Approve" },
  approved: { target: "published", label: "Publish" },
  published: { target: "hidden", label: "Hide from store" },
  hidden: { target: "archived", label: "Archive" },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; sort?: string }>;
}) {
  const data = await getProductOptions();
  const query = await searchParams;
  const term = query.q?.trim().toLocaleLowerCase() ?? "";
  const status = query.status ?? "all";
  const sort = query.sort ?? "recent";
  const products = data.products
    .filter(
      (product) =>
        (!term ||
          `${product.name} ${product.brand} ${product.category}`
            .toLocaleLowerCase()
            .includes(term)) &&
        (status === "all" || product.status === status),
    )
    .toSorted((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : 0));

  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="products-title"
    >
      <header>
        <p className="eyebrow">Catalog operations</p>
        <h1 id="products-title">Product Management</h1>
        <p>
          Create product records and move them through the approved publication
          workflow. Customer visibility updates immediately.
        </p>
      </header>
      <article className="admin-module-card catalog-product-card">
        <span>New product</span>
        <h2>Create a product</h2>
        <ProductForm brands={data.brands} categories={data.categories} />
      </article>
      <form
        className="brand-toolbar product-toolbar"
        method="get"
        role="search"
      >
        <label>
          Search products
          <input
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder="Product, brand or category"
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="all">All statuses</option>
            {[
              "draft",
              "review",
              "approved",
              "published",
              "hidden",
              "archived",
            ].map((value) => (
              <option key={value} value={value}>
                {value[0]?.toUpperCase()}
                {value.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort by
          <select name="sort" defaultValue={sort}>
            <option value="recent">Recently created</option>
            <option value="name">Product name</option>
          </select>
        </label>
        <button className="button button--primary">Apply</button>
        <a href="/admin/products">Clear</a>
      </form>
      <article className="admin-module-card">
        <span>Catalog</span>
        <h2>Products</h2>
        {products.length ? (
          <div className="admin-product-list">
            {products.map((product) => {
              const action = lifecycleAction[product.status];
              return (
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
                    {action && (
                      <form action={transitionProduct}>
                        <input
                          type="hidden"
                          name="productId"
                          value={product.id}
                        />
                        <input type="hidden" name="slug" value={product.slug} />
                        <input
                          type="hidden"
                          name="targetStatus"
                          value={action.target}
                        />
                        <button className="button button--secondary">
                          {action.label}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>No products match these filters.</p>
        )}
      </article>
    </section>
  );
}
