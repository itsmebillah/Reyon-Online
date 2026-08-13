"use client";

import { useActionState } from "react";
import {
  findReturnEligibility,
  submitReturnRequest,
  type CancellationState,
  type ReturnEligibilityState,
} from "./actions";

const reasons = [
  ["wrong-product", "Wrong Product"],
  ["damaged", "Damaged"],
  ["defective", "Defective"],
  ["missing-item", "Missing Item"],
  ["not-as-described", "Not as Described"],
  ["changed-mind", "Changed Mind"],
  ["other", "Other"],
] as const;

export function ReturnRequestForm() {
  const [eligibility, check, checking] = useActionState<
    ReturnEligibilityState,
    FormData
  >(findReturnEligibility, {});
  const [submission, submit, submitting] = useActionState<
    CancellationState,
    FormData
  >(submitReturnRequest, {});
  return (
    <>
      <form action={check} className="admin-auth-form">
        <label>
          Order number
          <input name="orderReference" required placeholder="RYN-2026-000001" />
        </label>
        <label>
          Checkout phone
          <input name="phone" type="tel" required />
        </label>
        <button className="button button--secondary" disabled={checking}>
          {checking ? "Checking…" : "Check eligible items"}
        </button>
        {eligibility.error && (
          <p className="admin-form-error">{eligibility.error}</p>
        )}
      </form>
      {eligibility.order && (
        <form action={submit} className="admin-auth-form">
          <input
            type="hidden"
            name="orderReference"
            value={eligibility.order.orderNumber}
          />
          <label>
            Checkout phone
            <input name="phone" type="tel" required />
          </label>
          <label>
            Product
            <select name="orderLineId" required defaultValue="">
              <option value="" disabled>
                Select an eligible item
              </option>
              {eligibility.order.lines
                .filter((line) => Number(line.remainingQuantity) > 0)
                .map((line) => (
                  <option key={line.lineId} value={line.lineId}>
                    {line.productName}
                    {line.variantLabel ? ` — ${line.variantLabel}` : ""} ·{" "}
                    {line.remainingQuantity} remaining
                  </option>
                ))}
            </select>
          </label>
          <label>
            Quantity
            <input name="quantity" type="number" min="1" step="1" required />
          </label>
          <label>
            Reason
            <select name="reason" required defaultValue="">
              <option value="" disabled>
                Select a reason
              </option>
              {reasons.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Product condition
            <select name="condition" required defaultValue="unopened-unused">
              <option value="unopened-unused">Unopened / unused</option>
              <option value="opened-used">Opened / used</option>
              <option value="not-received">Not received / missing</option>
            </select>
          </label>
          <label>
            Return details
            <textarea name="note" required />
          </label>
          <label>
            Photo evidence reference
            <input
              name="photoReference"
              placeholder="Required for wrong, damaged, defective or missing claims"
            />
          </label>
          <label>
            Video evidence reference (optional)
            <input name="videoReference" />
          </label>
          {submission.error && (
            <p className="admin-form-error">{submission.error}</p>
          )}
          {submission.success && (
            <p className="admin-form-success">{submission.success}</p>
          )}
          <button className="button button--primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit return request"}
          </button>
        </form>
      )}
    </>
  );
}
