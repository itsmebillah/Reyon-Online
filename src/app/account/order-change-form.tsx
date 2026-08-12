"use client";
import { useActionState } from "react";
import { requestOrderChange, type CancellationState } from "./actions";
export function OrderChangeForm() {
  const [state, action, pending] = useActionState<CancellationState, FormData>(
    requestOrderChange,
    {},
  );
  return (
    <form action={action} className="admin-auth-form">
      <label>
        Order number
        <input name="orderReference" required />
      </label>
      <label>
        Checkout phone
        <input name="phone" required />
      </label>
      <label>
        Correction or return details
        <textarea name="request" required />
      </label>
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
      <button className="button button--secondary" disabled={pending}>
        Submit request
      </button>
    </form>
  );
}
