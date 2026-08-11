"use client";
import { useActionState } from "react";
import { saveCheckoutAddress, type AddressState } from "./actions";
const initial: AddressState = {};
export function AddressForm() {
  const [state, action, pending] = useActionState(saveCheckoutAddress, initial);
  return (
    <form action={action} className="checkout-address-form">
      <h2>Delivery address</h2>
      <div className="form-grid">
        <label>
          Full name
          <input name="fullName" required autoComplete="name" />
        </label>
        <label>
          Phone
          <input name="phone" required autoComplete="tel" inputMode="tel" />
        </label>
        <label>
          Flat No <span>Optional where not applicable</span>
          <input name="flatNo" />
        </label>
        <label>
          House No
          <input name="houseNo" required />
        </label>
        <label>
          Road
          <input name="road" required />
        </label>
        <label>
          Village / City
          <input name="villageCity" required />
        </label>
        <label>
          Thana / Upazila
          <input name="thanaUpazila" required />
        </label>
        <label>
          District
          <input name="district" required />
        </label>
        <label>
          Division
          <input name="division" required />
        </label>
      </div>
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
      <button className="button button--primary" disabled={pending}>
        {pending ? "Saving…" : "Save and continue"}
      </button>
      <p className="field-help">
        Your information is private and used only for account, order, delivery,
        and support.
      </p>
    </form>
  );
}
