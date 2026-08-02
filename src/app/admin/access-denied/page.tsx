import type { Metadata } from "next";
import Link from "next/link";
import { logoutAdmin } from "../login/actions";

export const metadata: Metadata = {
  title: "Admin access unavailable",
  robots: { index: false, follow: false },
};

export default function AdminAccessDeniedPage() {
  return (
    <main className="admin-auth-page" id="main">
      <section className="admin-auth-card">
        <p className="eyebrow">Protected workspace</p>
        <h1>Admin access unavailable</h1>
        <p>
          This account is not authorized for the REYON Business OS. Contact the
          Product Owner if you believe access should be granted.
        </p>
        <form action={logoutAdmin}>
          <button className="button button--primary" type="submit">
            Sign out and return to sign in
          </button>
        </form>
        <Link className="admin-return-link" href="/">
          Return to the REYON website
        </Link>
      </section>
    </main>
  );
}
