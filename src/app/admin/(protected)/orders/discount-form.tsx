"use client";
import { useActionState, useState } from "react";
import { applyOrderDiscount } from "./actions";

export function DiscountForm({
  orderId,
  lines,
}: {
  orderId: string;
  lines: {
    id: string;
    product_name_snapshot: string;
    variant_label_snapshot: string;
  }[];
}) {
  const [state, action, pending] = useActionState(applyOrderDiscount, {});
  const [scope, setScope] = useState("order");
  return (
    <form action={action} className="admin-form">
      <input type="hidden" name="orderId" value={orderId} />
      <label>
        <span>Discount applies to</span>
        <select
          name="scope"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
        >
          <option value="order">Order subtotal</option>
          <option value="line">One order line</option>
        </select>
      </label>
      {scope === "line" && (
        <label>
          <span>Order line</span>
          <select name="orderLineId" required>
            <option value="">Select a line</option>
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.product_name_snapshot} — {line.variant_label_snapshot}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        <span>Discount type</span>
        <select name="discountType" required>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed amount</option>
        </select>
      </label>
      <label>
        <span>Value</span>
        <input
          name="discountValue"
          type="number"
          min="0.01"
          step="0.01"
          required
        />
      </label>
      <label>
        <span>Reason</span>
        <textarea name="reason" required rows={3} />
      </label>
      <button className="button button--primary" disabled={pending}>
        {pending ? "Applying…" : "Apply audited discount"}
      </button>
      {state.error && <p className="form-error">{state.error}</p>}
      {state.success && <p className="form-success">{state.success}</p>}
    </form>
  );
}
