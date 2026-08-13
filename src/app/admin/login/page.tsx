import type { Metadata } from "next";
import Link from "next/link";
import { ReyonLogo } from "@/components/reyon-logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main className="admin-auth-page" id="main">
      <section className="admin-auth-card" aria-labelledby="admin-login-title">
        <ReyonLogo priority />
        <p className="eyebrow">Business OS</p>
        <h1 id="admin-login-title">Welcome back</h1>
        <p>
          Sign in to manage REYON operations. Access is limited to explicitly
          authorized administrators.
        </p>
        <LoginForm />
        <Link className="admin-return-link" href="/">
          Return to the REYON website
        </Link>
      </section>
    </main>
  );
}
