"use client";
import { useActionState } from "react";
import type { PurchaseRelationship } from "@/features/purchasing/data/purchase-order-management";
import {
  createPurchaseOrder,
  savePurchaseLine,
  setPurchaseDiscount,
  type PurchaseActionState,
} from "./actions";
const initial: PurchaseActionState = {};
function Result({ state }: { state: PurchaseActionState }) {
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
export function CreatePurchaseOrderForm({
  suppliers,
}: {
  suppliers: readonly { id: string; name: string; code: string }[];
}) {
  const [state, action, pending] = useActionState(createPurchaseOrder, initial);
  return (
    <form action={action} className="catalog-admin-form">
      <label>
        Active supplier
        <select name="supplierId" required defaultValue="">
          <option value="" disabled>
            Select supplier
          </option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </label>
      <label className="publish-choice">
        <input name="isEmergency" type="checkbox" />
        <span>
          <strong>Emergency purchase</strong>
          <small>Flags urgency without bypassing approval.</small>
        </span>
      </label>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Creating…" : "Create draft PO"}
      </button>
    </form>
  );
}
export function PurchaseLineForm({
  orderId,
  relationships,
}: {
  orderId: string;
  relationships: readonly PurchaseRelationship[];
}) {
  const [state, action, pending] = useActionState(savePurchaseLine, initial);
  return (
    <form action={action} className="catalog-admin-form">
      <input type="hidden" name="orderId" value={orderId} />
      <label>
        Supplier product / variant
        <select name="variantId" required defaultValue="">
          <option value="" disabled>
            Select variant
          </option>
          {relationships.map((r) => (
            <option key={r.id} value={r.variantId}>
              {r.productName} — {r.variantLabel} · {r.supplierSku}
              {r.isPreferred ? " · Preferred" : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Order unit
          <select name="orderUnit" defaultValue="unit">
            <option value="unit">Individual units</option>
            <option value="pack">Supplier packs</option>
          </select>
        </label>
        <label>
          Quantity / packs
          <input
            name="quantity"
            type="number"
            min="0.000001"
            step="0.000001"
            required
          />
        </label>
        <label>
          Unit cost (BDT)
          <input name="unitCost" type="number" min="0" step="0.01" required />
        </label>
        <label>
          Discount type
          <select name="discountType" defaultValue="">
            <option value="">No line discount</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed BDT</option>
          </select>
        </label>
        <label>
          Discount value
          <input
            name="discountValue"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
          />
        </label>
      </div>
      <p className="field-help">
        Supplier MOQ, pack size, relationship, and non-negative totals are
        validated by the database.
      </p>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Saving…" : "Add or update line"}
      </button>
    </form>
  );
}
export function PurchaseDiscountForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(setPurchaseDiscount, initial);
  return (
    <form action={action} className="catalog-admin-form">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="form-grid">
        <label>
          Order discount
          <select name="discountType" defaultValue="">
            <option value="">None</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed BDT</option>
          </select>
        </label>
        <label>
          Value
          <input
            name="discountValue"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
          />
        </label>
      </div>
      <Result state={state} />
      <button className="button button--secondary" disabled={pending}>
        Save order discount
      </button>
    </form>
  );
}
