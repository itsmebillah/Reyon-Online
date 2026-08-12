"use client";
import { useActionState } from "react";
import { transitionOrder, type OrderActionState } from "./actions";

export function TransitionForm({
  orderId,
  transitions,
}: {
  orderId: string;
  transitions: {
    key: string;
    name: string;
    requiresReason: boolean;
    requiresHandoff: boolean;
  }[];
}) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(
    transitionOrder,
    {},
  );
  if (!transitions.length)
    return (
      <p className="admin-empty">
        No further Order Management action is available.
      </p>
    );
  return (
    <form action={action} className="admin-auth-form">
      <input type="hidden" name="orderId" value={orderId} />
      <label>
        Next status
        <select name="targetState" required>
          {transitions.map((item) => (
            <option key={item.key} value={item.key}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Reason
        <textarea
          name="reason"
          placeholder="Required for cancellation, rejection, and exceptions"
        />
      </label>
      <label>
        Delivery handoff reference
        <textarea
          name="handoffReference"
          placeholder="Required before shipment"
        />
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
      <button className="button button--primary" disabled={pending}>
        {pending ? "Updating…" : "Update order status"}
      </button>
    </form>
  );
}
