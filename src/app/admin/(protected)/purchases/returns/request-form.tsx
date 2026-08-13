"use client";
import { useActionState } from "react";
import type { EligiblePurchaseReturn } from "@/features/purchasing/data/purchase-returns";
import { requestPurchaseReturn, type PurchaseReturnState } from "./actions";
const initial: PurchaseReturnState = {};
export function PurchaseReturnRequestForm({
  eligible,
}: {
  eligible: readonly EligiblePurchaseReturn[];
}) {
  const [state, action, pending] = useActionState(
    requestPurchaseReturn,
    initial,
  );
  return (
    <form action={action} className="catalog-admin-form">
      <label>
        Eligible received item
        <select name="receiptLineId" required defaultValue="">
          <option value="" disabled>
            Select receipt and item
          </option>
          {eligible
            .filter((x) => x.acceptedQuantity > x.returnedQuantity)
            .map((x) => (
              <option key={x.receiptLineId} value={x.receiptLineId}>
                {x.receiptReference} · {x.productName} — {x.variantLabel} ·
                eligible {x.acceptedQuantity - x.returnedQuantity}
              </option>
            ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Return quantity
          <input
            name="quantity"
            type="number"
            min="0.000001"
            step="0.000001"
            required
          />
        </label>
        <label>
          Reason
          <select name="reason" required defaultValue="">
            <option value="" disabled>
              Select reason
            </option>
            <option value="damaged">Damaged</option>
            <option value="wrong-product">Wrong Product</option>
            <option value="excess">Excess</option>
            <option value="quality-issue">Quality Issue</option>
            <option value="expired-near-expiry">Expired/Near Expiry</option>
            <option value="supplier-discrepancy">Supplier Discrepancy</option>
          </select>
        </label>
      </div>
      <label>
        Return note
        <textarea name="note" rows={3} required />
      </label>
      {state.error ? (
        <p className="admin-form-error" role="alert">
          {state.error}
        </p>
      ) : state.success ? (
        <p className="admin-form-success" role="status">
          {state.success}
        </p>
      ) : null}
      <button className="button button--primary" disabled={pending}>
        {pending ? "Requesting…" : "Request purchase return"}
      </button>
    </form>
  );
}
