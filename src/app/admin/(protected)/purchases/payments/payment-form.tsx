"use client";
import { useActionState } from "react";
import type { SupplierPayable } from "@/features/purchasing/data/supplier-payments";
import {
  recordSupplierPayment,
  type SupplierPaymentActionState,
} from "./actions";

const initial: SupplierPaymentActionState = {};
export function SupplierPaymentForm({
  payables,
}: {
  payables: readonly SupplierPayable[];
}) {
  const [state, action, pending] = useActionState(
    recordSupplierPayment,
    initial,
  );
  const eligible = payables.filter(
    (item) => item.outstandingAmount - item.pendingAmount > 0,
  );
  return (
    <form action={action} className="catalog-admin-form">
      <label>
        Purchase order
        <select name="poId" required defaultValue="">
          <option value="" disabled>
            Select payable PO
          </option>
          {eligible.map((item) => (
            <option value={item.poId} key={item.poId}>
              {item.poReference} — {item.supplierName} — BDT{" "}
              {(item.outstandingAmount - item.pendingAmount).toFixed(2)}{" "}
              available
            </option>
          ))}
        </select>
      </label>
      <label>
        Amount (BDT)
        <input name="amount" type="number" min="0.01" step="0.01" required />
      </label>
      <label>
        Payment date
        <input name="paymentDate" type="date" required />
      </label>
      <label>
        Payment method
        <input name="method" required placeholder="Bank, cash, bKash…" />
      </label>
      <label>
        Transaction/reference ID
        <input name="providerReference" required />
      </label>
      <label>
        Evidence reference
        <input name="evidenceReference" required />
      </label>
      <label>
        Internal note <span>(optional)</span>
        <textarea name="note" />
      </label>
      {state.error && <p className="form-message is-error">{state.error}</p>}
      {state.success && <p className="form-message">{state.success}</p>}
      <button
        className="button button--primary"
        disabled={pending || !eligible.length}
      >
        {pending ? "Recording…" : "Record payment"}
      </button>
      {!eligible.length && (
        <p className="admin-empty">No PO currently has payable headroom.</p>
      )}
    </form>
  );
}
