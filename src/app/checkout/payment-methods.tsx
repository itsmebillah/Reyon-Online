"use client";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { savePaymentSelection } from "./actions";
export type PaymentMethod = {
  id: string;
  method_key: string;
  name: string;
  method_kind: string;
  is_selectable: boolean;
  instructions: string | null;
  account_reference: string | null;
};
export function PaymentMethods({
  methods,
  selectedId,
}: {
  methods: readonly PaymentMethod[];
  selectedId: string | null;
}) {
  const [selected, setSelected] = useState(selectedId ?? "");
  const [state, action, pending] = useActionState(savePaymentSelection, {});
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);
  return (
    <form action={action} className="checkout-payment" id="payment-method">
      <h2>Payment method</h2>
      <div>
        {methods.map((method) => (
          <label
            className={!method.is_selectable ? "is-disabled" : undefined}
            key={method.id}
          >
            <input
              type="radio"
              name="paymentMethod"
              value={method.id}
              disabled={!method.is_selectable}
              checked={selected === method.id}
              onChange={() => setSelected(method.id)}
            />
            <span>
              <strong>{method.name}</strong>
              <small>
                {method.method_kind === "card"
                  ? "Gateway integration is not yet available"
                  : method.method_kind === "cod"
                    ? "Pay when your order is delivered"
                    : method.is_selectable
                      ? method.instructions
                      : "Awaiting payment instructions"}
              </small>
            </span>
          </label>
        ))}
      </div>
      {selected &&
        methods.find((m) => m.id === selected)?.method_kind === "mobile" && (
          <label>
            Transaction / reference
            <input name="transactionReference" required />
          </label>
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
        className="button button--secondary"
        disabled={!selected || pending}
      >
        {pending
          ? "Saving…"
          : selectedId
            ? "Update payment method"
            : "Save payment method"}
      </button>
    </form>
  );
}
