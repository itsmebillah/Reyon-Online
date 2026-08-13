"use client";

import { useActionState } from "react";
import { findDeliveryStatus } from "./actions";

export function DeliveryStatusForm() {
  const [state, action, pending] = useActionState(findDeliveryStatus, {});
  return (
    <>
      <form action={action} className="admin-form">
        <label>
          <span>Order reference</span>
          <input name="orderReference" required placeholder="RYN-2026-000001" />
        </label>
        <label>
          <span>Checkout phone</span>
          <input name="phone" type="tel" required autoComplete="tel" />
        </label>
        <button className="button button--primary" disabled={pending}>
          {pending ? "Checking delivery…" : "Check delivery status"}
        </button>
        {state.error && <p className="form-error">{state.error}</p>}
      </form>
      {state.delivery && (
        <article className="admin-module-card" aria-live="polite">
          <span>{state.delivery.orderNumber}</span>
          <h3>{state.delivery.status}</h3>
          <p>
            Shipment reference:{" "}
            {state.delivery.shipmentReference ?? "Not available yet"}
          </p>
          <p>
            Last updated:{" "}
            {state.delivery.updatedAt
              ? new Date(state.delivery.updatedAt).toLocaleString("en-BD")
              : "Not available"}
          </p>
        </article>
      )}
    </>
  );
}
