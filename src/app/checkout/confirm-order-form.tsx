"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmOrder, type CheckoutState } from "./actions";

export function ConfirmOrderForm() {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    confirmOrder,
    {},
  );
  const router = useRouter();
  useEffect(() => {
    if (state.orderPlaced) router.replace("/checkout/success");
  }, [router, state.orderPlaced]);
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
