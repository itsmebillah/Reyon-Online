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
  const [reviewing, setReviewing] = useState(Boolean(selectedId));
  const [state, action, pending] = useActionState(savePaymentSelection, {});
  const router = useRouter();
  const method = methods.find((item) => item.id === selected);
  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);
  return (
    <form action={action} className="checkout-payment" id="payment-method">
      {!reviewing ? (
        <>
          <h2>Payment method</h2>
          <div>
            {methods.map((item) => (
              <label
                className={!item.is_selectable ? "is-disabled" : undefined}
                key={item.id}
              >
                <input
                  type="radio"
                  name="paymentMethodChoice"
                  value={item.id}
                  disabled={!item.is_selectable}
                  checked={selected === item.id}
                  onChange={() => setSelected(item.id)}
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.method_kind === "card"
                      ? "Manual follow-up; no card details are collected here"
                      : item.method_kind === "cod"
                        ? "Pay when your order is delivered"
                        : item.is_selectable
                          ? item.instructions
                          : "Awaiting payment instructions"}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="button button--secondary"
            disabled={!selected}
            onClick={() => {
              setReviewing(true);
              requestAnimationFrame(() =>
                document
                  .getElementById("payment-confirmation")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              );
            }}
          >
            Continue to payment
          </button>
        </>
      ) : method ? (
        <section
          id="payment-confirmation"
          className="payment-confirmation-step"
        >
          <input type="hidden" name="paymentMethod" value={method.id} />
          <div className="checkout-step-heading">
            <div>
              <p className="eyebrow">Payment confirmation</p>
              <h2>{method.name}</h2>
            </div>
            <button
              type="button"
              className="checkout-edit"
              onClick={() => setReviewing(false)}
            >
              Change method
            </button>
          </div>
          {method.method_kind === "mobile" ? (
            <>
              <p>{method.instructions}</p>
              {method.account_reference && (
                <p>
                  Payment number: <strong>{method.account_reference}</strong>
                </p>
              )}
              <label>
                Transaction / reference
                <input name="transactionReference" required />
              </label>
              <p className="field-help">
                REYON will verify this evidence manually. Saving it does not
                mark payment as verified.
              </p>
            </>
          ) : method.method_kind === "card" ? (
            <p className="field-help">
              Card gateway processing is not active. No card number, PIN, CVV,
              or payment success is collected or recorded here. REYON will
              follow up manually.
            </p>
          ) : (
            <p className="field-help">
              Cash on Delivery will remain payable until the order is delivered
              and payment is recorded.
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
          <button className="button button--secondary" disabled={pending}>
            {pending ? "Saving…" : "Save and continue"}
          </button>
        </section>
      ) : (
        <p className="admin-form-error" role="alert">
          The selected payment method is no longer available. Choose another
          method.
        </p>
      )}
    </form>
  );
}
