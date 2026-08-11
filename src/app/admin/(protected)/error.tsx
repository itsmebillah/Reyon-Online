"use client";
export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="admin-dashboard">
      <div className="admin-state">
        <span>Unable to load</span>
        <h1>Something needs attention</h1>
        <p>
          The requested administration data could not be loaded. Your saved
          business data has not been changed.
        </p>
        <button className="button button--primary" onClick={reset}>
          Try again
        </button>
      </div>
    </section>
  );
}
