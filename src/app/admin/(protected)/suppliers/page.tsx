import type { Metadata } from "next";
import { getSupplierManagement } from "@/features/purchasing/data/supplier-management";
import { CreateSupplierForm, SupplierVariantForm } from "./supplier-forms";
import { transitionSupplier } from "./actions";
export const metadata: Metadata = {
  title: "Supplier Management",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
const next = {
  draft: "active",
  active: "suspended",
  suspended: "archived",
} as const;
export default async function SuppliersPage() {
  const { suppliers, variants } = await getSupplierManagement();
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="suppliers-title"
    >
      <header>
        <p className="eyebrow">Purchase operations</p>
        <h1 id="suppliers-title">Supplier Management</h1>
        <p>
          Govern approved suppliers and variant-level purchasing terms without
          changing product or inventory history.
        </p>
      </header>
      <article className="admin-module-card">
        <span>New supplier</span>
        <h2>Create a supplier</h2>
        <CreateSupplierForm />
      </article>
      <div className="brand-management-list">
        <div className="brand-list-heading">
          <h2>Suppliers</h2>
          <span>{suppliers.length}</span>
        </div>
        {suppliers.length ? (
          suppliers.map((s) => (
            <details className="brand-editor" key={s.id}>
              <summary>
                <span>
                  <strong>{s.displayName}</strong>
                  <small>
                    {s.code} · {s.status} · {s.relationships.length} sourcing
                    relationship(s)
                  </small>
                </span>
                <span>Manage</span>
              </summary>
              <dl className="brand-audit">
                <div>
                  <dt>Legal name</dt>
                  <dd>{s.legalName ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt>Created</dt>
                  <dd>{new Date(s.createdAt).toLocaleString("en-GB")}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{new Date(s.updatedAt).toLocaleString("en-GB")}</dd>
                </div>
              </dl>
              {s.status === "active" && (
                <>
                  <h3>Variant sourcing</h3>
                  <SupplierVariantForm supplierId={s.id} variants={variants} />
                </>
              )}
              {s.relationships.length > 0 && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Variant</th>
                        <th>Supplier code</th>
                        <th>MOQ / pack</th>
                        <th>Cost</th>
                        <th>Lead</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.relationships.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {r.productName} — {r.variantLabel}
                            <small>{r.sku}</small>
                          </td>
                          <td>{r.supplierSku}</td>
                          <td>
                            {r.minimumOrderQuantity} / {r.packSize}
                          </td>
                          <td>৳{r.purchaseCost}</td>
                          <td>{r.leadTimeDays} days</td>
                          <td>
                            {r.isPreferred ? "Preferred · " : ""}
                            {r.isActive ? "Active" : "Inactive"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {s.status !== "archived" && (
                <form
                  action={transitionSupplier}
                  className="catalog-admin-form"
                >
                  <input type="hidden" name="supplierId" value={s.id} />
                  <input
                    type="hidden"
                    name="toState"
                    value={next[s.status as keyof typeof next]}
                  />
                  <label>
                    Lifecycle reason{" "}
                    {s.status === "draft" && (
                      <span>(optional for activation)</span>
                    )}
                    <input name="reason" required={s.status !== "draft"} />
                  </label>
                  <button className="button button--secondary">
                    {s.status === "draft"
                      ? "Activate supplier"
                      : s.status === "active"
                        ? "Suspend supplier"
                        : "Archive supplier"}
                  </button>
                </form>
              )}
            </details>
          ))
        ) : (
          <p className="admin-empty">
            No suppliers exist yet. Create the first supplier above.
          </p>
        )}
      </div>
    </section>
  );
}
