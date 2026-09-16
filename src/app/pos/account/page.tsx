import { ChangePasswordForm } from "@/features/access/components/change-password-form";
import { requirePosAccess } from "@/features/pos/data/pos-access";

export default async function PosAccountPage() {
  const context = await requirePosAccess();
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Account &amp; password</h1>
          <p>{context.email}</p>
        </div>
      </header>
      <section className="pos-panel" style={{ maxWidth: 560 }}>
        <h2>Change password</h2>
        <p>
          Confirm your current password and choose a new password with at least
          8 characters. You will sign in again after it changes.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
