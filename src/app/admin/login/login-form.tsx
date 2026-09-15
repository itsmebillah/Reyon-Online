"use client";

import { useActionState } from "react";
import { loginAdmin, type LoginState } from "./actions";
import Link from "next/link";

const initialState: LoginState = {};

export function LoginForm({ next = "/admin" }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAdmin, initialState);

  return (
    <form action={action} className="admin-auth-form">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="admin-email">Email address</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {pending ? "Signing in…" : "Sign in securely"}
      </button>
      <Link className="admin-return-link" href="/admin/forgot-password">
        Forgot password?
      </Link>
    </form>
  );
}
