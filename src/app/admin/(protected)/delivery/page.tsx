import type { Metadata } from "next";
import { getDeliveryZones } from "@/features/delivery/data/delivery-management";
import { updateDeliveryZone } from "./actions";
export const metadata: Metadata = {
  title: "Delivery Configuration",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function DeliveryPage() {
  const zones = await getDeliveryZones();
  return (
    <section className="admin-dashboard catalog-admin">
      <header>
        <p className="eyebrow">Checkout operations</p>
        <h1>Delivery zones & charges</h1>
        <p>
          Configure customer-facing delivery charges without changing
          application code.
        </p>
      </header>
      <div className="catalog-admin-grid">
        {zones.map((zone) => (
          <article className="admin-module-card" key={zone.id}>
            <span>
              {zone.isEnabled ? "Available at checkout" : "Not available"}
            </span>
            <h2>{zone.name}</h2>
            <form action={updateDeliveryZone} className="catalog-admin-form">
              <input type="hidden" name="zoneId" value={zone.id} />
              <label>
                Zone name
                <input name="name" required defaultValue={zone.name} />
              </label>
              <label>
                Delivery charge (BDT)
                <input
                  name="charge"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={zone.charge ?? ""}
                  placeholder="Set before enabling"
                />
              </label>
              <label>
                Display order
                <input
                  name="displayOrder"
                  type="number"
                  min="0"
                  defaultValue={zone.displayOrder}
                />
              </label>
              <label className="publish-choice">
                <input
                  name="isEnabled"
                  type="checkbox"
                  defaultChecked={zone.isEnabled}
                />
                <span>
                  <strong>Available at checkout</strong>
                  <small>Requires a configured charge.</small>
                </span>
              </label>
              <button className="button button--primary">Save zone</button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
