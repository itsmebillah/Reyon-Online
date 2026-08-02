import type { Metadata } from "next";
import { listManagedCollections } from "@/features/catalog/data/collection-management";
import { getProductOptions } from "@/features/catalog/data/product-management";
import { AddPinForm, CollectionSettingsForm } from "./collection-form";
import { removeCollectionPin } from "./actions";

export const metadata: Metadata = {
  title: "Homepage Collections",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const [collections, options] = await Promise.all([
    listManagedCollections(),
    getProductOptions(),
  ]);
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="collections-title"
    >
      <header>
        <p className="eyebrow">Store merchandising</p>
        <h1 id="collections-title">Homepage Collections</h1>
        <p>
          Control live product collections without editing the website.
          Automatic strategies use business data; pins remain optional and never
          bypass publication rules.
        </p>
      </header>
      <div className="collection-admin-list">
        {collections.map((collection) => (
          <details
            className="brand-editor"
            key={collection.id}
            open={collection.key === "new-arrivals"}
          >
            <summary>
              <span>
                <strong>{collection.name}</strong>
                <small>
                  {collection.isEnabled ? "Active" : "Inactive"} ·{" "}
                  {collection.strategy} · {collection.pins.length} pinned
                </small>
              </span>
              <span>Configure</span>
            </summary>
            <CollectionSettingsForm collection={collection} />
            <div className="collection-pins">
              <h3>Optional product pins</h3>
              <AddPinForm
                collectionId={collection.id}
                products={options.products}
              />
              {collection.pins.length ? (
                <div className="admin-product-list">
                  {collection.pins.map((pin) => (
                    <div key={pin.productId}>
                      <div>
                        <strong>{pin.productName}</strong>
                        <small>Order {pin.displayOrder}</small>
                      </div>
                      <form action={removeCollectionPin}>
                        <input
                          type="hidden"
                          name="collectionId"
                          value={collection.id}
                        />
                        <input
                          type="hidden"
                          name="productId"
                          value={pin.productId}
                        />
                        <button className="button button--secondary">
                          Remove pin
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="admin-empty">
                  No products pinned. Automatic collections continue using their
                  configured strategy.
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
