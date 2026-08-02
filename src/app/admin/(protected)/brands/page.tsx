import type { Metadata } from "next";
import { listManagedBrands } from "@/features/catalog/data/brand-management";
import { CreateBrandForm, EditBrandForm } from "./brand-forms";
import { setBrandArchived } from "./actions";

export const metadata: Metadata = {
  title: "Brand Management",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function BrandsPage() {
  const brands = await listManagedBrands();
  const active = brands.filter((b) => !b.archivedAt);
  const archived = brands.filter((b) => b.archivedAt);
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="brands-title"
    >
      <header>
        <p className="eyebrow">Catalog operations</p>
        <h1 id="brands-title">Brand Management</h1>
        <p>
          Create and maintain the product brands sold by REYON. REYON remains
          the retailer, never the manufacturer.
        </p>
      </header>
      <article className="admin-module-card brand-create-card">
        <span>New brand</span>
        <h2>Create a brand</h2>
        <CreateBrandForm />
      </article>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>Active brands</h2>
          <span>{active.length}</span>
        </div>
        {active.length ? (
          active.map((brand) => (
            <details className="brand-editor" key={brand.id}>
              <summary>
                <span>
                  <strong>{brand.name}</strong>
                  <small>{brand.isVisible ? "Visible" : "Hidden"}</small>
                </span>
                <span>Edit</span>
              </summary>
              <EditBrandForm brand={brand} />
              <form action={setBrandArchived} className="archive-action">
                <input type="hidden" name="brandId" value={brand.id} />
                <input type="hidden" name="archived" value="true" />
                <button className="button button--secondary">
                  Archive brand
                </button>
              </form>
            </details>
          ))
        ) : (
          <p className="admin-empty">
            No brands yet. Create the first product brand above.
          </p>
        )}
        {archived.length > 0 && (
          <>
            <div className="brand-list-heading">
              <h2>Archived brands</h2>
              <span>{archived.length}</span>
            </div>
            {archived.map((brand) => (
              <article className="archived-brand" key={brand.id}>
                <div>
                  <strong>{brand.name}</strong>
                  <small>Archived</small>
                </div>
                <form action={setBrandArchived}>
                  <input type="hidden" name="brandId" value={brand.id} />
                  <input type="hidden" name="archived" value="false" />
                  <button className="button button--secondary">
                    Restore brand
                  </button>
                </form>
              </article>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
