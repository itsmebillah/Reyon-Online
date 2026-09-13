"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container page empty-state">
      <h1>We couldn’t load this page.</h1>
      <p>
        Please try again. Your saved order and shopping bag have not been
        removed.
      </p>
      <button className="button button--primary" onClick={reset}>
        Try again
      </button>
      <Link href="/contact">Contact REYON</Link>
    </div>
  );
}
