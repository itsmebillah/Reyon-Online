import type { Metadata } from "next";
import {
  getDeliveryOperations,
  getDeliveryZones,
} from "@/features/delivery/data/delivery-management";
import {
  assignShipment,
  completeDelivery,
  reconcileCod,
  recordDeliveryAttempt,
  recordDeliveryException,
  transitionDelivery,
  updateDeliveryZone,
} from "./actions";
import { DeliveryPartnerForm } from "./delivery-partner-form";
export const metadata: Metadata = {
  title: "Delivery Configuration",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function DeliveryPage() {
  const [zones, operations] = await Promise.all([
    getDeliveryZones(),
    getDeliveryOperations(),
  ]);
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
      <article className="admin-module-card">
        <span>Provider-neutral configuration</span>
        <h2>Delivery partner</h2>
        <DeliveryPartnerForm />
      </article>
      {operations.partners.map((partner) => (
        <article className="admin-module-card" key={partner.id}>
          <span>
            {partner.isActive ? "Active partner" : "Inactive partner"}
          </span>
          <h2>{partner.name}</h2>
          <DeliveryPartnerForm partner={partner} />
        </article>
      ))}
      <article className="admin-module-card order-list-card">
        <span>One order · one shipment</span>
        <h2>Delivery operations</h2>
        {operations.shipments.length ? (
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Partner</th>
                  <th>Reference</th>
                  <th>Attempts</th>
                  <th>Operations</th>
                </tr>
              </thead>
              <tbody>
                {operations.shipments.map((shipment) => (
                  <tr key={shipment.id}>
                    <td>
                      <strong>{shipment.orderNumber}</strong>
                    </td>
                    <td>{shipment.state}</td>
                    <td>{shipment.partner ?? "Not assigned"}</td>
                    <td>{shipment.reference ?? "Not available"}</td>
                    <td>{shipment.attemptCount} / 3</td>
                    <td>
                      {shipment.state === "ready-for-dispatch" ? (
                        <form
                          action={assignShipment}
                          className="catalog-admin-form"
                        >
                          <input
                            type="hidden"
                            name="fulfillmentId"
                            value={shipment.id}
                          />
                          <input
                            name="handlerName"
                            required
                            placeholder="Courier / handler"
                          />
                          <input
                            name="shipmentReference"
                            required
                            placeholder="Shipment reference"
                          />
                          <button className="button button--primary">
                            Assign
                          </button>
                        </form>
                      ) : shipment.state === "courier-assigned" ? (
                        <form
                          action={transitionDelivery}
                          className="catalog-admin-form"
                        >
                          <input
                            type="hidden"
                            name="fulfillmentId"
                            value={shipment.id}
                          />
                          <input
                            type="hidden"
                            name="targetState"
                            value="picked-up"
                          />
                          <input
                            name="note"
                            required
                            placeholder="Pickup / handoff evidence"
                          />
                          <button className="button button--primary">
                            Record pickup
                          </button>
                        </form>
                      ) : shipment.state === "picked-up" ||
                        shipment.state === "in-transit" ? (
                        <form action={transitionDelivery}>
                          <input
                            type="hidden"
                            name="fulfillmentId"
                            value={shipment.id}
                          />
                          <input
                            type="hidden"
                            name="targetState"
                            value={
                              shipment.state === "picked-up"
                                ? "in-transit"
                                : "out-for-delivery"
                            }
                          />
                          <button className="button button--secondary">
                            {shipment.state === "picked-up"
                              ? "Mark in transit"
                              : "Mark out for delivery"}
                          </button>
                        </form>
                      ) : shipment.state === "out-for-delivery" ? (
                        <div className="catalog-admin-form">
                          <form
                            action={recordDeliveryAttempt}
                            className="catalog-admin-form"
                          >
                            <input
                              type="hidden"
                              name="fulfillmentId"
                              value={shipment.id}
                            />
                            <select name="result" required defaultValue="">
                              <option value="" disabled>
                                Attempt result
                              </option>
                              <option value="successful">Successful</option>
                              <option value="failed">Failed</option>
                            </select>
                            <input
                              name="reason"
                              required
                              placeholder="Attempt result reason"
                            />
                            <input
                              name="note"
                              required
                              placeholder="Operational note"
                            />
                            <button className="button button--secondary">
                              Record attempt
                            </button>
                          </form>
                          <form
                            action={completeDelivery}
                            className="catalog-admin-form"
                          >
                            <input
                              type="hidden"
                              name="fulfillmentId"
                              value={shipment.id}
                            />
                            <input
                              name="receiverName"
                              required
                              placeholder="Receiver name"
                            />
                            <input
                              name="responsibleIdentity"
                              required
                              placeholder="Courier / responsible staff"
                            />
                            <input
                              name="confirmationNote"
                              required
                              placeholder="Delivery confirmation"
                            />
                            {shipment.paymentKind === "cod" ? (
                              <>
                                <input
                                  name="collectedAmount"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  required
                                  defaultValue={shipment.expectedAmount}
                                  aria-label="COD amount collected"
                                />
                                <input
                                  name="codMismatchReason"
                                  placeholder="Required only if COD amount differs"
                                />
                              </>
                            ) : null}
                            <button className="button button--primary">
                              Confirm delivered
                            </button>
                          </form>
                        </div>
                      ) : shipment.state === "delivered" &&
                        shipment.codMismatch ? (
                        <form
                          action={reconcileCod}
                          className="catalog-admin-form"
                        >
                          <input
                            type="hidden"
                            name="fulfillmentId"
                            value={shipment.id}
                          />
                          <input
                            name="collectedAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            defaultValue={shipment.expectedAmount}
                            aria-label="Corrected COD amount"
                          />
                          <input
                            name="reason"
                            required
                            placeholder="COD correction reason"
                          />
                          <button className="button button--primary">
                            Reconcile COD
                          </button>
                        </form>
                      ) : (
                        (shipment.handler ?? "No action required")
                      )}
                      {[
                        "ready-for-dispatch",
                        "courier-assigned",
                        "picked-up",
                        "in-transit",
                        "out-for-delivery",
                      ].includes(shipment.state) ? (
                        <form
                          action={recordDeliveryException}
                          className="catalog-admin-form"
                        >
                          <input
                            type="hidden"
                            name="fulfillmentId"
                            value={shipment.id}
                          />
                          <select
                            name="exceptionState"
                            required
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Record exception
                            </option>
                            {shipment.state === "ready-for-dispatch" ||
                            shipment.state === "courier-assigned" ? (
                              <option value="delivery-cancelled">
                                Delivery cancelled
                              </option>
                            ) : (
                              <>
                                <option value="lost">Lost</option>
                                <option value="damaged">Damaged</option>
                              </>
                            )}
                          </select>
                          <input
                            name="reason"
                            required
                            placeholder="Exception reason"
                          />
                          <input
                            name="note"
                            required
                            placeholder="Internal audit note"
                          />
                          <button className="button button--secondary">
                            Record exception
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">
            Packed orders will create Ready for Dispatch shipments
            automatically.
          </p>
        )}
      </article>
    </section>
  );
}
