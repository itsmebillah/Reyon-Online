import Link from "next/link";
import { ReyonLogo } from "@/components/reyon-logo";
import { ResetPasswordForm } from "./form";

export const metadata = {
  title: "Set new admin password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="admin-auth-page" id="main">
      <section className="admin-auth-card">
        <ReyonLogo />
        <p className="eyebrow">Business OS</p>
        <h1>Choose a new password</h1>
        <p>Use at least 8 characters, then sign in again.</p>
        {params.reset && params.reset !== "complete" && (
          <p className="admin-form-error" role="alert">
            This reset link is invalid or expired. Request a new link and open
            it from the same browser.
          </p>
        )}
        <ResetPasswordForm />
        <Link className="admin-return-link" href="/admin/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
