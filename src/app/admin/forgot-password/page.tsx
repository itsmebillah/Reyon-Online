import Link from "next/link";
import { ReyonLogo } from "@/components/reyon-logo";
import { ForgotPasswordForm } from "./form";

export const metadata = {
  title: "Reset admin password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="admin-auth-page" id="main">
      <section className="admin-auth-card">
        <ReyonLogo />
        <p className="eyebrow">Business OS</p>
        <h1>Reset your password</h1>
        <p>Enter your admin email and we’ll send a secure reset link.</p>
        <ForgotPasswordForm />
        <Link className="admin-return-link" href="/admin/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
