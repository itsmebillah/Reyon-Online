"use client";

import { useActionState } from "react";
import { confirmOrder, type CheckoutState } from "./actions";

export function ConfirmOrderForm() {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    confirmOrder,
    {},
  );
  return (
    <form
      action={action}
      className="checkout-confirmation"
      id="order-confirmation"
    >
      {state.error && (
        <p className="admin-form-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="button button--primary" disabled={pending}>
        {pending ? "Confirming…" : "Confirm order"}
      </button>
      <p>
        Your customer profile will be created or associated when the order is
        placed. Contact verification is not required in this release.
      </p>
    </form>
  );
}
