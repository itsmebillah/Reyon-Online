import type { Metadata } from "next";
import { listManagedCategories } from "@/features/catalog/data/category-management";
import { CreateCategoryForm, EditCategoryForm } from "./category-forms";
import { setCategoryArchived } from "./actions";
export const metadata: Metadata = {
  title: "Category Management",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function CategoriesAdminPage() {
  const categories = await listManagedCategories();
  const active = categories.filter((c) => !c.archivedAt),
    archived = categories.filter((c) => c.archivedAt);
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="categories-title"
    >
      <header>
        <p className="eyebrow">Catalog operations</p>
        <h1 id="categories-title">Category Management</h1>
        <p>
          Organize products into clear customer-friendly collections, with
          optional subcategories for future growth.
        </p>
      </header>
      <article className="admin-module-card brand-create-card">
        <span>New category</span>
        <h2>Create a category</h2>
        <CreateCategoryForm categories={categories} />
      </article>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>Active categories</h2>
          <span>{active.length}</span>
        </div>
        {active.map((category) => (
          <details className="brand-editor" key={category.id}>
            <summary>
              <span>
                <strong>{category.name}</strong>
                <small>
                  {category.parentName
                    ? `Under ${category.parentName}`
                    : category.isVisible
                      ? "Visible top-level category"
                      : "Hidden top-level category"}
                </small>
              </span>
              <span>Edit</span>
            </summary>
            <EditCategoryForm category={category} categories={categories} />
            <form action={setCategoryArchived} className="archive-action">
              <input type="hidden" name="categoryId" value={category.id} />
              <input type="hidden" name="archived" value="true" />
              <button className="button button--secondary">
                Archive category
              </button>
            </form>
          </details>
        ))}
        {archived.length > 0 && (
          <>
            <div className="brand-list-heading">
              <h2>Archived categories</h2>
              <span>{archived.length}</span>
            </div>
            {archived.map((category) => (
              <article className="archived-brand" key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <small>Archived</small>
                </div>
                <form action={setCategoryArchived}>
                  <input type="hidden" name="categoryId" value={category.id} />
                  <input type="hidden" name="archived" value="false" />
                  <button className="button button--secondary">
                    Restore category
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
