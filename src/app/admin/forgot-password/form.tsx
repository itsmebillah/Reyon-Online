"use client";
import { useActionState } from "react";
import { requestPasswordReset, type ResetState } from "../login/actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    requestPasswordReset,
    {},
  );
  return (
    <form action={action} className="admin-auth-form">
      <div>
        <label htmlFor="reset-email">Email address</label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
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
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Sending…" : "Email reset link"}
      </button>
    </form>
  );
}
