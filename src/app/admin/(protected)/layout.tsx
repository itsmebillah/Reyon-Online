import { requireReyonAdmin } from "@/features/access/data/admin-access";
import { logoutAdmin } from "@/app/admin/login/actions";
import Link from "next/link";
import { AdminNavigation } from "@/components/admin-navigation";
import { AdminBackNavigation } from "@/components/admin-back-navigation";
import { ReyonLogo } from "@/components/reyon-logo";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireReyonAdmin();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-sidebar__brand" href="/admin">
          <ReyonLogo />
          <span>Business OS</span>
        </Link>
        <AdminNavigation />
        <div className="admin-sidebar__account">
          <small>Signed in as</small>
          <span>
            {typeof admin.email === "string" ? admin.email : "Administrator"}
          </span>
          <form action={logoutAdmin}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <span>Administration</span>
            <strong>Business workspace</strong>
          </div>
          <Link className="button button--secondary" href="/">
            View store
          </Link>
        </header>
        <main id="main">
          <AdminBackNavigation />
          {children}
        </main>
      </div>
    </div>
  );
}
