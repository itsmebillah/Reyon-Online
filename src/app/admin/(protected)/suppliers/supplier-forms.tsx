"use client";
import { useActionState } from "react";
import type { PurchaseVariant } from "@/features/purchasing/data/supplier-management";
import {
  createSupplier,
  saveSupplierVariant,
  type SupplierActionState,
} from "./actions";
const initial: SupplierActionState = {};
function Result({ state }: { state: SupplierActionState }) {
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
export function CreateSupplierForm() {
  const [state, action, pending] = useActionState(createSupplier, initial);
  return (
    <form action={action} className="catalog-admin-form">
      <div className="form-grid">
        <label>
          Supplier code
          <input
            name="code"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="supplier-code"
          />
        </label>
        <label>
          Display name
          <input name="displayName" required />
        </label>
      </div>
      <label>
        Legal name <span>(optional)</span>
        <input name="legalName" />
      </label>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Creating…" : "Create supplier"}
      </button>
    </form>
  );
}
export function SupplierVariantForm({
  supplierId,
  variants,
}: {
  supplierId: string;
  variants: readonly PurchaseVariant[];
}) {
  const [state, action, pending] = useActionState(saveSupplierVariant, initial);
  return (
    <form action={action} className="catalog-admin-form">
      <input type="hidden" name="supplierId" value={supplierId} />
      <label>
        Product variant
        <select name="variantId" required defaultValue="">
          <option value="" disabled>
            Select a variant
          </option>
          {variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.productName} — {v.label} ({v.sku})
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Supplier SKU / code
          <input name="supplierSku" required />
        </label>
        <label>
          Purchase cost (BDT)
          <input
            name="purchaseCost"
            type="number"
            min="0"
            step="0.01"
            required
          />
        </label>
        <label>
          Minimum order quantity
          <input
            name="moq"
            type="number"
            min="0.000001"
            step="0.000001"
            defaultValue="1"
            required
          />
        </label>
        <label>
          Pack size
          <input
            name="packSize"
            type="number"
            min="0.000001"
            step="0.000001"
            defaultValue="1"
            required
          />
        </label>
        <label>
          Lead time (days)
          <input
            name="leadTimeDays"
            type="number"
            min="0"
            step="1"
            defaultValue="0"
            required
          />
        </label>
      </div>
      <label className="publish-choice">
        <input name="isPreferred" type="checkbox" />
        <span>
          <strong>Preferred supplier</strong>
          <small>Replaces the current preferred source for this variant.</small>
        </span>
      </label>
      <label className="publish-choice">
        <input name="isActive" type="checkbox" defaultChecked />
        <span>
          <strong>Active sourcing relationship</strong>
        </span>
      </label>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Saving…" : "Save sourcing terms"}
      </button>
    </form>
  );
}
