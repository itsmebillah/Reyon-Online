"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  saveCheckoutAddress,
  type AddressState,
  type CheckoutAddress,
} from "./actions";
const initial: AddressState = {};
export function AddressForm({ address }: { address: CheckoutAddress | null }) {
  const [state, action, pending] = useActionState(saveCheckoutAddress, initial);
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);
  const field = (name: keyof CheckoutAddress) => ({
    "aria-invalid": Boolean(state.fieldErrors?.[name]),
    "aria-describedby": state.fieldErrors?.[name] ? `${name}-error` : undefined,
  });
  const error = (name: keyof CheckoutAddress) =>
    state.fieldErrors?.[name] ? (
      <small id={`${name}-error`} className="field-error">
        {state.fieldErrors[name]}
      </small>
    ) : null;
  return (
    <form action={action} className="checkout-address-form">
      <h2>Delivery address</h2>
      <div className="form-grid">
        <label>
          Full name
          <input
            name="fullName"
            required
            autoComplete="name"
            defaultValue={address?.fullName}
            {...field("fullName")}
          />
          {error("fullName")}
        </label>
        <label>
          Phone
          <input
            name="phone"
            required
            autoComplete="tel"
            inputMode="tel"
            defaultValue={address?.phone}
            {...field("phone")}
          />
          {error("phone")}
        </label>
        <label>
          Flat No <span>Optional where not applicable</span>
          <input name="flatNo" defaultValue={address?.flatNo ?? ""} />
        </label>
        <label>
          House No
          <input
            name="houseNo"
            required
            defaultValue={address?.houseNo}
            {...field("houseNo")}
          />
          {error("houseNo")}
        </label>
        <label>
          Road
          <input
            name="road"
            required
            defaultValue={address?.road}
            {...field("road")}
          />
          {error("road")}
        </label>
        <label>
          Village / City
          <input
            name="villageCity"
            required
            defaultValue={address?.villageCity}
            {...field("villageCity")}
          />
          {error("villageCity")}
        </label>
        <label>
          Thana / Upazila
          <input
            name="thanaUpazila"
            required
            defaultValue={address?.thanaUpazila}
            {...field("thanaUpazila")}
          />
          {error("thanaUpazila")}
        </label>
        <label>
          District
          <input
            name="district"
            required
            defaultValue={address?.district}
            {...field("district")}
          />
          {error("district")}
        </label>
        <label>
          Division
          <input
            name="division"
            required
            defaultValue={address?.division}
            {...field("division")}
          />
          {error("division")}
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
        {pending ? "Saving…" : address ? "Update address" : "Save and continue"}
      </button>
      <p className="field-help">
        Your information is private and used only for account, order, delivery,
        and support.
      </p>
    </form>
  );
}
