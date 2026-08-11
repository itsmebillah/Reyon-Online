"use client";

import { useActionState } from "react";
import type { InventoryDashboard } from "@/features/inventory/data/inventory-management";
import {
  recordInventoryMovement,
  reverseInventoryMovement,
  type InventoryActionState,
} from "./actions";

const initial: InventoryActionState = {};
const movementTypes = [
  ["opening-stock", "Opening Stock"],
  ["purchase-receive", "Purchase / Receive"],
  ["sale", "Sale"],
  ["return-in", "Return In"],
  ["return-out", "Return Out"],
  ["adjustment-in", "Adjustment In"],
  ["adjustment-out", "Adjustment Out"],
  ["damage-loss", "Damage / Loss"],
] as const;

function Result({ state }: { state: InventoryActionState }) {
  if (state.error)
    return (
      <p className="admin-form-error" role="alert">
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p className="admin-form-success" role="status">
        {state.success}
      </p>
    );
  return null;
}

export function InventoryEntryForm({
  variants,
  locations,
}: Pick<InventoryDashboard, "variants" | "locations">) {
  const [state, action, pending] = useActionState(
    recordInventoryMovement,
    initial,
  );
  return (
    <form action={action} className="catalog-admin-form inventory-entry-form">
      <div className="form-grid">
        <label>
          Product variant
          <select name="variantId" required defaultValue="">
            <option value="" disabled>
              Select a variant
            </option>
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.productName} — {variant.variantLabel} ({variant.sku})
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <select
            name="locationId"
            required
            defaultValue={locations[0]?.id ?? ""}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Movement type
          <select name="movementType" required defaultValue="purchase-receive">
            {movementTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity{" "}
          <span>Enter a positive number; movement type controls direction</span>
          <input
            name="quantity"
            type="number"
            min="0.000001"
            step="0.000001"
            required
          />
        </label>
        <label>
          Reference{" "}
          <span>Optional purchase, order, return, or document reference</span>
          <input name="reference" maxLength={120} />
        </label>
        <label>
          Reason{" "}
          <span>Recommended for adjustments, damage, loss, and returns</span>
          <input name="reason" maxLength={300} />
        </label>
      </div>
      <Result state={state} />
      <button
        className="button button--primary"
        disabled={pending || !variants.length}
      >
        {pending ? "Recording…" : "Record movement"}
      </button>
    </form>
  );
}

export function InventoryCorrectionForm({
  movementId,
}: {
  movementId: string;
}) {
  const [state, action, pending] = useActionState(
    reverseInventoryMovement,
    initial,
  );
  return (
    <form action={action} className="inventory-correction-form">
      <input type="hidden" name="movementId" value={movementId} />
      <label>
        Correction reason
        <input
          name="reason"
          required
          maxLength={300}
          placeholder="Explain the mistake"
        />
      </label>
      <Result state={state} />
      <button className="button button--secondary" disabled={pending}>
        {pending ? "Recording…" : "Record correction"}
      </button>
    </form>
  );
}
