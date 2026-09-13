import Link from "next/link";
import { ReyonLogo } from "@/components/reyon-logo";
import { ResetPasswordForm } from "./form";

export const metadata = {
  title: "Set new admin password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <main className="admin-auth-page" id="main">
      <section className="admin-auth-card">
        <ReyonLogo />
        <p className="eyebrow">Business OS</p>
        <h1>Choose a new password</h1>
        <p>Use at least 8 characters, then sign in again.</p>
        <ResetPasswordForm />
        <Link className="admin-return-link" href="/admin/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
