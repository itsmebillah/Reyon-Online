import type { Metadata } from "next";
import { listManagedBrands } from "@/features/catalog/data/brand-management";
import { CreateBrandForm, EditBrandForm } from "./brand-forms";
import { setBrandArchived } from "./actions";

export const metadata: Metadata = {
  title: "Brand Management",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
type BrandQuery = Readonly<{
  q?: string;
  lifecycle?: string;
  visibility?: string;
  featured?: string;
  sort?: string;
}>;
const date = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<BrandQuery>;
}) {
  const brands = await listManagedBrands();
  const query = await searchParams;
  const term = query.q?.trim().toLocaleLowerCase() ?? "";
  const lifecycle = query.lifecycle ?? "active";
  const visibility = query.visibility ?? "all";
  const featured = query.featured ?? "all";
  const sort = query.sort ?? "display";
  const filtered = brands
    .filter(
      (brand) =>
        (!term ||
          brand.name.toLocaleLowerCase().includes(term) ||
          brand.slug.includes(term) ||
          brand.countryCode?.toLocaleLowerCase().includes(term)) &&
        (lifecycle === "all" ||
          (lifecycle === "archived" ? brand.archivedAt : !brand.archivedAt)) &&
        (visibility === "all" ||
          (visibility === "visible" ? brand.isVisible : !brand.isVisible)) &&
        (featured === "all" ||
          (featured === "featured" ? brand.isFeatured : !brand.isFeatured)),
    )
    .toSorted((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
      return a.displayOrder - b.displayOrder || a.name.localeCompare(b.name);
    });
  const active = filtered.filter((brand) => !brand.archivedAt);
  const archived = filtered.filter((brand) => brand.archivedAt);
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
      <form className="brand-toolbar" method="get" role="search">
        <label>
          Search brands
          <input
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder="Name, slug or country"
          />
        </label>
        <label>
          Lifecycle
          <select name="lifecycle" defaultValue={lifecycle}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </label>
        <label>
          Visibility
          <select name="visibility" defaultValue={visibility}>
            <option value="all">All</option>
            <option value="visible">Active in store</option>
            <option value="hidden">Inactive in store</option>
          </select>
        </label>
        <label>
          Featured
          <select name="featured" defaultValue={featured}>
            <option value="all">All</option>
            <option value="featured">Featured</option>
            <option value="standard">Standard</option>
          </select>
        </label>
        <label>
          Sort by
          <select name="sort" defaultValue={sort}>
            <option value="display">Display order</option>
            <option value="name">Brand name</option>
            <option value="updated">Recently updated</option>
          </select>
        </label>
        <button className="button button--primary">Apply</button>
        <a href="/admin/brands">Clear</a>
      </form>
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
                  <small>
                    Order {brand.displayOrder} ·{" "}
                    {brand.isVisible ? "Active" : "Inactive"}
                    {brand.isFeatured ? " · Featured" : ""}
                  </small>
                </span>
                <span>Edit</span>
              </summary>
              <EditBrandForm brand={brand} />
              <dl className="brand-audit">
                <div>
                  <dt>Slug</dt>
                  <dd>{brand.slug}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{date(brand.createdAt)}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{date(brand.updatedAt)}</dd>
                </div>
              </dl>
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
            No brands match these filters. Clear the filters or create a brand.
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
                  <small>Archived · Updated {date(brand.updatedAt)}</small>
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
