"use client";

import { useActionState } from "react";
import {
  processExpiredReservations,
  resolveReview,
  type ReviewActionState,
} from "./actions";

const initialState: ReviewActionState = {};

export function ExpiredReservationAction() {
  const [state, action, pending] = useActionState(
    processExpiredReservations,
    initialState,
  );
  return (
    <form action={action} className="admin-auth-form">
      <button className="button button--secondary" disabled={pending}>
        {pending ? "Processing…" : "Process expired reservations"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

export function ReviewResolutionAction({
  caseId,
  orderId,
  type,
}: {
  caseId: string;
  orderId: string;
  type: string;
}) {
  const [state, action, pending] = useActionState(resolveReview, initialState);
  const cancellation = type === "cancellation-request";
  return (
    <form action={action} className="admin-auth-form">
      <input type="hidden" name="caseId" value={caseId} />
      <input type="hidden" name="orderId" value={orderId} />
      <label>
        Resolution
        <select name="resolution" required defaultValue="">
          <option value="" disabled>
            Select resolution
          </option>
          {cancellation ? (
            <>
              <option value="approved">Approve cancellation</option>
              <option value="declined">Decline cancellation</option>
            </>
          ) : (
            <>
              <option value="resolved">Resolve review</option>
              <option value="dismissed">Dismiss review</option>
            </>
          )}
        </select>
      </label>
      <label>
        Internal resolution note
        <textarea name="note" required />
      </label>
      <button className="button button--primary" disabled={pending}>
        {pending ? "Saving…" : "Save resolution"}
      </button>
      <ActionFeedback state={state} />
    </form>
  );
}

function ActionFeedback({ state }: { state: ReviewActionState }) {
  return (
    <>
      {state.error ? (
        <p className="admin-form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="admin-form-success" role="status">
          {state.success}
        </p>
      ) : null}
    </>
  );
}
