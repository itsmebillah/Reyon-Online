"use client";
import { useActionState, useState } from "react";
import { savePaymentSelection, type AddressState } from "./actions";
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
  selectedId?: string | null;
}) {
  const available = methods
    .filter((m) => m.is_selectable && m.method_kind !== "card")
    .toSorted(
      (a, b) =>
        Number(b.method_kind === "cod") - Number(a.method_kind === "cod"),
    );
  const [id, setId] = useState(selectedId ?? available[0]?.id ?? "");
  const method = available.find((m) => m.id === id);
  const [s, a, p] = useActionState<AddressState, FormData>(
    savePaymentSelection,
    {},
  );
  return (
    <form action={a} id="payment-method" className="payment-methods">
      <h2>Payment method</h2>
      {available.length === 0 ? (
        <p>No payment method is currently available. Contact REYON.</p>
      ) : (
        <>
          <div className="payment-options">
            {available.map((m) => (
              <label key={m.id}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value={m.id}
                  checked={m.id === id}
                  onChange={() => setId(m.id)}
                />
                {m.name}
              </label>
            ))}
          </div>
          {method?.method_kind === "mobile" ? (
            <>
              <p>{method.instructions}</p>
              <p>Payment account: {method.account_reference}</p>
              <label>
                Transaction / reference
                <input name="transactionReference" required maxLength={200} />
              </label>
              <p>
                Payment is manually reviewed. A submitted reference is not
                payment confirmation.
              </p>
            </>
          ) : (
            <p>
              Pay the displayed total on delivery. Delivery charges are included
              in the order total.
            </p>
          )}
          <button className="button button--secondary" disabled={p || !method}>
            {p ? "Saving…" : "Save payment method"}
          </button>
        </>
      )}
      {s.error && <p role="alert">{s.error}</p>}
      {s.success && <p role="status">{s.success}</p>}
    </form>
  );
}
