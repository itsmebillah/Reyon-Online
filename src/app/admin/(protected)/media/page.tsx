import type { Metadata } from "next";
import { listManagedProductMedia } from "@/features/catalog/data/product-media-management";
import { AddProductImageForm, ProductImageEditor } from "./media-forms";
import { removeProductImage } from "./actions";

export const metadata: Metadata = {
  title: "Product Media",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ProductMediaPage() {
  const products = await listManagedProductMedia();
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="media-title"
    >
      <header>
        <p className="eyebrow">Catalog operations</p>
        <h1 id="media-title">Product Media</h1>
        <p>
          Build accessible product galleries with validated, licensed images.
          The first ordered image is always the customer-facing primary image.
        </p>
      </header>
      {products.length ? (
        <div className="product-media-list">
          {products.map((product) => {
            const defaultAlt = `${product.brand} ${product.name} product image`;
            return (
              <details
                className="brand-editor product-media-product"
                key={product.id}
              >
                <summary>
                  <span>
                    <strong>
                      {product.brand} · {product.name}
                    </strong>
                    <small>
                      {product.media.length} of 12 images · {product.status}
                    </small>
                  </span>
                  <span>Manage gallery</span>
                </summary>
                <div className="product-media-content">
                  <section>
                    <h2>Add gallery image</h2>
                    <AddProductImageForm
                      productId={product.id}
                      slug={product.slug}
                      defaultAlt={defaultAlt}
                      disabled={product.media.length >= 12}
                    />
                  </section>
                  <section>
                    <h2>Current gallery</h2>
                    {product.media.length ? (
                      <div className="media-editor-grid">
                        {product.media.map((image) => (
                          <div key={image.id}>
                            <ProductImageEditor
                              image={image}
                              productId={product.id}
                              slug={product.slug}
                            />
                            <form
                              action={removeProductImage}
                              className="media-remove-form"
                            >
                              <input
                                type="hidden"
                                name="mediaId"
                                value={image.id}
                              />
                              <input
                                type="hidden"
                                name="slug"
                                value={product.slug}
                              />
                              <button
                                className="button button--secondary"
                                disabled={product.media.length <= 1}
                              >
                                Remove image
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="admin-empty">
                        No images are attached. Add the required primary image.
                      </p>
                    )}
                  </section>
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <p className="admin-empty">
          Create a product before managing product media.
        </p>
      )}
    </section>
  );
}
