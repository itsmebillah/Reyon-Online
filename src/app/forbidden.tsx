import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="admin-auth-page" id="main">
      <section className="admin-auth-card">
        <p className="eyebrow">403 · Permission required</p>
        <h1>Access denied</h1>
        <p>
          Your account is signed in, but it does not have permission to use this
          workspace or action.
        </p>
        <Link className="button button--primary" href="/pos/dashboard">
          Return to your workspace
        </Link>
      </section>
    </main>
  );
}
