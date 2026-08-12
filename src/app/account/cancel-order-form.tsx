"use client";
import { useActionState } from "react";
import { requestCancellation, type CancellationState } from "./actions";
export function CancelOrderForm() {
  const [state, action, pending] = useActionState<CancellationState, FormData>(
    requestCancellation,
    {},
  );
  return (
    <form action={action} className="admin-auth-form">
      <label>
        Order number
        <input name="orderReference" required placeholder="RYN-2026-000001" />
      </label>
      <label>
        Checkout phone
        <input name="phone" required />
      </label>
      <label>
        Reason
        <textarea name="reason" required />
      </label>
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
      <button className="button button--secondary" disabled={pending}>
        {pending ? "Submitting…" : "Request cancellation"}
      </button>
    </form>
  );
}
