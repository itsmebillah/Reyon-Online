"use client";

import { useActionState } from "react";
import { findDeliveryStatus } from "./actions";

export function DeliveryStatusForm() {
  const [state, action, pending] = useActionState(findDeliveryStatus, {});
  return (
    <>
      <form action={action} className="admin-form">
        <label>
          <span>Phone used for the order</span>
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="01712345678"
          />
        </label>
        <button className="button button--primary" disabled={pending}>
          {pending ? "Checking orders…" : "Check my orders"}
        </button>
        {state.error && <p className="form-error">{state.error}</p>}
      </form>
      {state.deliveries?.map((delivery) => (
        <article
          className="admin-module-card"
          aria-live="polite"
          key={delivery.orderNumber}
        >
          <span>{delivery.orderNumber}</span>
          <h3>{delivery.status}</h3>
          <p>
            Shipment reference:{" "}
            {delivery.shipmentReference ?? "Not available yet"}
          </p>
          <p>
            Last updated:{" "}
            {delivery.updatedAt
              ? new Date(delivery.updatedAt).toLocaleString("en-BD")
              : "Not available"}
          </p>
        </article>
      ))}
    </>
  );
}
