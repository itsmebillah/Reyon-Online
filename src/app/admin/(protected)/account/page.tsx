import { ChangePasswordForm } from "@/features/access/components/change-password-form";

export default function AdminAccountPage() {
  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <p className="eyebrow">Account security</p>
          <h1>Change password</h1>
          <p>
            Confirm your current password and choose a new password with at
            least 8 characters. You will sign in again after it changes.
          </p>
        </div>
      </header>
      <div className="admin-card" style={{ maxWidth: 560 }}>
        <ChangePasswordForm />
      </div>
    </section>
  );
}
