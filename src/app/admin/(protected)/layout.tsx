import { requireReyonAdmin } from "@/features/access/data/admin-access";
import { logoutAdmin } from "@/app/admin/login/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireReyonAdmin();

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">REYON Business OS</p>
          <p className="admin-header__identity">
            {typeof admin.email === "string" ? admin.email : "Administrator"}
          </p>
        </div>
        <nav className="admin-header__actions" aria-label="Admin navigation">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/brands">Brands</Link>
          <form action={logoutAdmin}>
            <button className="button button--secondary" type="submit">
              Sign out
            </button>
          </form>
        </nav>
      </header>
      <main id="main">{children}</main>
    </div>
  );
}
