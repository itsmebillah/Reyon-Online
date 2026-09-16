"use client";

import { useActionState } from "react";
import {
  changeOwnPassword,
  type ChangePasswordState,
} from "@/features/access/actions/change-password";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<
    ChangePasswordState,
    FormData
  >(changeOwnPassword, {});
  return (
    <form action={action} className="admin-auth-form">
      <div>
        <label htmlFor="current-password">Current password</label>
        <input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label htmlFor="new-account-password">New password</label>
        <input
          id="new-account-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div>
        <label htmlFor="confirm-account-password">Confirm new password</label>
        <input
          id="confirm-account-password"
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
        {pending ? "Changing…" : "Change password"}
      </button>
    </form>
  );
}
