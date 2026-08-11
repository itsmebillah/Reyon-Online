import type { Metadata } from "next";
import { getInventoryDashboard } from "@/features/inventory/data/inventory-management";
import { InventoryCorrectionForm, InventoryEntryForm } from "./inventory-forms";

export const metadata: Metadata = {
  title: "Inventory Entry",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const label = (value: string) =>
  value
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
const number = (value: number) =>
  new Intl.NumberFormat("en-BD", { maximumFractionDigits: 6 }).format(value);
const date = (value: string) =>
  new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));

export default async function InventoryPage() {
  const data = await getInventoryDashboard();
  return (
    <section
      className="admin-dashboard catalog-admin"
      aria-labelledby="inventory-title"
    >
      <header>
        <p className="eyebrow">Stock operations</p>
        <h1 id="inventory-title">Inventory Entry</h1>
        <p>
          Record variant-level stock movements at Main Inventory. On-hand and
          customer availability are calculated from the immutable ledger.
        </p>
      </header>
      <article className="admin-module-card inventory-entry-card">
        <span>New movement</span>
        <h2>Record inventory</h2>
        <InventoryEntryForm
          variants={data.variants}
          locations={data.locations}
        />
      </article>
      <article className="admin-module-card inventory-position-card">
        <span>Live position</span>
        <h2>Variant stock</h2>
        {data.variants.length ? (
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product / variant</th>
                  <th>SKU</th>
                  <th>On-hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Website</th>
                </tr>
              </thead>
              <tbody>
                {data.variants.map((variant) => (
                  <tr key={variant.id}>
                    <td>
                      <strong>{variant.productName}</strong>
                      <small>{variant.variantLabel}</small>
                    </td>
                    <td>{variant.sku}</td>
                    <td>{number(variant.onHand)}</td>
                    <td>{number(variant.reserved)}</td>
                    <td>{number(variant.available)}</td>
                    <td>
                      <span
                        className={`status-pill ${variant.available <= 0 ? "status-pill--out" : "status-pill--published"}`}
                      >
                        {variant.available <= 0 ? "Out of stock" : "Available"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">
            Create a product variant before recording inventory.
          </p>
        )}
      </article>
      <article className="admin-module-card inventory-history-card">
        <span>Audit ledger</span>
        <h2>Recent movements</h2>
        {data.movements.length ? (
          <div className="inventory-history">
            {data.movements.map((movement) => (
              <details key={movement.id} className="inventory-movement">
                <summary>
                  <span>
                    <strong>
                      {movement.productName} — {movement.variantLabel}
                    </strong>
                    <small>
                      {label(movement.movementType)} · {movement.locationName} ·{" "}
                      {date(movement.occurredAt)}
                    </small>
                  </span>
                  <strong
                    className={movement.quantity > 0 ? "stock-in" : "stock-out"}
                  >
                    {movement.quantity > 0 ? "+" : ""}
                    {number(movement.quantity)}
                  </strong>
                </summary>
                <dl className="inventory-audit">
                  <div>
                    <dt>Actor</dt>
                    <dd>{movement.actor ?? "Administrator"}</dd>
                  </div>
                  <div>
                    <dt>Reference</dt>
                    <dd>{movement.sourceReference}</dd>
                  </div>
                  <div>
                    <dt>Reason</dt>
                    <dd>{movement.reason ?? "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Recorded</dt>
                    <dd>{date(movement.recordedAt)}</dd>
                  </div>
                </dl>
                {movement.reversesMovementId ? (
                  <p className="field-help">
                    Correction movement; original record preserved.
                  </p>
                ) : movement.isReversed ? (
                  <p className="field-help">
                    This movement has been corrected; both records remain in the
                    ledger.
                  </p>
                ) : (
                  <InventoryCorrectionForm movementId={movement.id} />
                )}
              </details>
            ))}
          </div>
        ) : (
          <p className="admin-empty">
            No inventory movements have been recorded.
          </p>
        )}
      </article>
    </section>
  );
}
