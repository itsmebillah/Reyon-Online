"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/features/catalog";
import { saveDeliveryZone, type CheckoutState } from "./actions";

export type DeliveryZone = Readonly<{
  id: string;
  zone_key: string;
  name: string;
  charge_amount: number;
  currency_code: "BDT";
}>;

export function DeliveryZoneForm({
  zones,
  selectedId,
}: {
  zones: readonly DeliveryZone[];
  selectedId: string | null;
}) {
  const [selected, setSelected] = useState(selectedId ?? "");
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    saveDeliveryZone,
    {},
  );
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);
  return (
    <form action={action} className="checkout-payment" id="delivery-zone">
      <h2>Delivery zone</h2>
      {zones.length ? (
        <div>
          {zones.map((zone) => (
            <label key={zone.id}>
              <input
                type="radio"
                name="deliveryZone"
                value={zone.id}
                checked={selected === zone.id}
                onChange={() => setSelected(zone.id)}
              />
              <span>
                <strong>{zone.name}</strong>
                <small>
                  {formatMoney({
                    amount: Number(zone.charge_amount),
                    currency: zone.currency_code,
                  })}
                </small>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="cart-warning">
          Delivery is not configured yet. Please contact REYON for assistance.
        </p>
      )}
      {state.error && (
        <p className="admin-form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="admin-form-success" role="status">
          {state.success}
        </p>
      )}
      {zones.length > 0 && (
        <button
          className="button button--secondary"
          disabled={!selected || pending}
        >
          {pending
            ? "Checking delivery…"
            : selectedId
              ? "Update delivery option"
              : "Continue to payment"}
        </button>
      )}
    </form>
  );
}
