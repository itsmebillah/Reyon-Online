"use client";
import { useActionState } from "react";
import { districts } from "@/lib/bangladesh";
import {
  saveCheckoutAddress,
  type AddressState,
  type CheckoutAddress,
} from "./actions";
export function AddressForm({ address }: { address: CheckoutAddress | null }) {
  const [state, action, pending] = useActionState<AddressState, FormData>(
    saveCheckoutAddress,
    {},
  );
  return (
    <form action={action} className="checkout-address-form">
      <h2>Where should we deliver?</h2>
      <p className="muted">Delivery address</p>
      <div className="form-grid">
        <label>
          Full name
          <input
            name="fullName"
            autoComplete="name"
            required
            maxLength={120}
            defaultValue={address?.fullName}
          />
        </label>
        <label>
          Mobile number
          <input
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={20}
            placeholder="01712345678"
            defaultValue={address?.phone}
            aria-invalid={!!state.fieldErrors?.phone}
          />
        </label>
        <label>
          District
          <select
            aria-label="District"
            name="district"
            required
            defaultValue={address?.district ?? ""}
          >
            <option value="" disabled>
              Select district
            </option>
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Area / Thana / Upazila
          <input
            name="thanaUpazila"
            autoComplete="address-level3"
            required
            maxLength={200}
            defaultValue={address?.thanaUpazila}
          />
        </label>
        <label className="full-width">
          Full delivery address
          <textarea
            name="houseNo"
            autoComplete="street-address"
            required
            minLength={5}
            maxLength={1000}
            rows={3}
            placeholder="House / building, road or village, nearby landmark"
            defaultValue={address?.houseNo}
          />
        </label>
        <label className="full-width">
          Order notes (optional)
          <textarea
            name="notes"
            maxLength={1000}
            rows={2}
            placeholder="Anything we should know for delivery?"
          />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="admin-form-error">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="admin-form-success">
          {state.success}
        </p>
      )}
      <button className="button button--primary" disabled={pending}>
        {pending ? "Savingâ€¦" : "Save address & see delivery charge"}
      </button>
    </form>
  );
}
