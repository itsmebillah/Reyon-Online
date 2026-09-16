import type { Metadata } from "next";
import Link from "next/link";
import { ReyonLogo } from "@/components/reyon-logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Shop administration sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; password?: string }>;
}) {
  const { next, password } = await searchParams;
  return (
    <main className="admin-auth-page" id="main">
      <section className="admin-auth-card" aria-labelledby="admin-login-title">
        <ReyonLogo priority />
        <p className="eyebrow">Shop administration &amp; POS</p>
        <h1 id="admin-login-title">Sign in to your workspace</h1>
        <p>
          Shop owners, administrators and employees use this secure sign-in.
          Your assigned role, store and permissions determine what appears after
          authentication.
        </p>
        {password === "changed" && (
          <p className="admin-form-success" role="status">
            Password changed. Sign in with your new password.
          </p>
        )}
        <LoginForm next={next} />
        <Link className="admin-return-link" href="/">
          Return to the REYON website
        </Link>
      </section>
    </main>
  );
}
