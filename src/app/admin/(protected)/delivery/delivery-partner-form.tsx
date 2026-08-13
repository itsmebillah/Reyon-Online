"use client";
import { useActionState } from "react";
import { configureDeliveryPartner, type DeliveryPartnerState } from "./actions";

type Partner = Readonly<{
  key: string;
  name: string;
  isActive: boolean;
}>;
export function DeliveryPartnerForm({ partner }: { partner?: Partner }) {
  const [state, action, pending] = useActionState<
    DeliveryPartnerState,
    FormData
  >(configureDeliveryPartner, {});
  return (
    <form action={action} className="catalog-admin-form">
      <label>
        Partner key
        <input
          name="partnerKey"
          required
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          title="Use lowercase letters, numbers, and single hyphens only."
          placeholder="delivery-partner"
          defaultValue={partner?.key}
          readOnly={Boolean(partner)}
        />
        <small>Lowercase letters, numbers, and single hyphens only.</small>
      </label>
      <label>
        Display name
        <input name="displayName" required defaultValue={partner?.name} />
      </label>
      <label className="publish-choice">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={partner?.isActive ?? true}
        />
        <span>
          <strong>Active delivery partner</strong>
          <small>Only one can be active initially.</small>
        </span>
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
        {pending
          ? "Saving…"
          : partner
            ? "Save partner changes"
            : "Save partner"}
      </button>
    </form>
  );
}
