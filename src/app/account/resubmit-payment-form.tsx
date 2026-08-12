"use client";
import { useActionState } from "react";
import { resubmitPayment, type CancellationState } from "./actions";
export function ResubmitPaymentForm() {
  const [state, action, pending] = useActionState<CancellationState, FormData>(
    resubmitPayment,
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
        Corrected transaction/reference ID
        <input name="transactionReference" required />
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
        Resubmit payment evidence
      </button>
    </form>
  );
}
