"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { confirmOrder, type CheckoutState } from "./actions";

export function ConfirmOrderForm({
  identityVerified,
}: {
  identityVerified: boolean;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    confirmOrder,
    {},
  );
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);
  return (
    <form action={action} className="checkout-confirmation">
      {!identityVerified && (
        <p className="cart-warning" role="status">
          Phone verification is required before the order can be confirmed. OTP
          delivery is not currently available.
        </p>
      )}
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
      <button
        className="button button--primary"
        disabled={!identityVerified || pending}
      >
        {pending ? "Confirming…" : "Confirm order"}
      </button>
      <p>No identity is marked verified by this checkout action.</p>
    </form>
  );
}
