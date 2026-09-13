"use client";
import { useActionState } from "react";
import { updateAdminPassword, type ResetState } from "../login/actions";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    updateAdminPassword,
    {},
  );
  return (
    <form action={action} className="admin-auth-form">
      <div>
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div>
        <label htmlFor="confirm-password">Confirm password</label>
        <input
          id="confirm-password"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state.error && (
        <p className="admin-form-error" role="alert">
          {state.error}
        </p>
      )}
      <button
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
