"use client";
import { useActionState } from "react";
import type { ReceivingOrder } from "@/features/purchasing/data/purchase-receiving";
import { receivePurchaseLine, type ReceivingState } from "./actions";
const initial: ReceivingState = {};
function Result({ state }: { state: ReceivingState }) {
  return state.error ? (
    <p className="admin-form-error" role="alert">
      {state.error}
    </p>
  ) : state.success ? (
    <p className="admin-form-success" role="status">
      {state.success}
    </p>
  ) : null;
}
export function ReceivingForm({ order }: { order: ReceivingOrder }) {
  const [state, action, pending] = useActionState(receivePurchaseLine, initial);
  return (
    <form action={action} className="catalog-admin-form">
      <input type="hidden" name="orderId" value={order.id} />
      <label>
        PO line
        <select name="orderLineId" required defaultValue="">
          <option value="" disabled>
            Select line
          </option>
          {order.lines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.productName} — {l.variantLabel} · remaining{" "}
              {Math.max(0, l.orderedQuantity - l.receivedQuantity)}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Accepted quantity
          <input
            name="accepted"
            type="number"
            min="0"
            step="0.000001"
            defaultValue="0"
            required
          />
        </label>
        <label>
          Damaged / rejected
          <input
            name="damagedRejected"
            type="number"
            min="0"
            step="0.000001"
            defaultValue="0"
            required
          />
        </label>
        <label>
          Quarantined
          <input
            name="quarantined"
            type="number"
            min="0"
            step="0.000001"
            defaultValue="0"
            required
          />
        </label>
        <label>
          Short quantity
          <input
            name="short"
            type="number"
            min="0"
            step="0.000001"
            defaultValue="0"
            required
          />
        </label>
        <label>
          Batch code <span>(optional)</span>
          <input name="batchCode" />
        </label>
        <label>
          Expiry <span>(requires batch)</span>
          <input name="expiresOn" type="date" />
        </label>
      </div>
      <label>
        Supplier delivery reference <span>(optional)</span>
        <input name="supplierDeliveryReference" />
      </label>
      <label>
        Delivery/evidence reference <span>(optional)</span>
        <input name="evidenceReference" />
      </label>
      <label>
        Discrepancy note{" "}
        <span>(required for short, damaged, quarantine, or excess)</span>
        <textarea name="discrepancyNote" rows={3} />
      </label>
      <label className="publish-choice">
        <input name="approveExcess" type="checkbox" />
        <span>
          <strong>Approve excess receipt</strong>
          <small>Admin/Super Admin only. Requires a discrepancy note.</small>
        </span>
      </label>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Recording…" : "Record receipt & inspection"}
      </button>
    </form>
  );
}
