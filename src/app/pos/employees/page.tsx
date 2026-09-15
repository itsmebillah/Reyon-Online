import { StaffTable } from "@/features/pos/components/staff-table";
import {
  getSelectedPosLocation,
  requirePosAccess,
} from "@/features/pos/data/pos-access";
import { getPosStaff } from "@/features/pos/data/pos-data";
type Staff = {
  userId: string;
  email: string;
  role: string;
  active: boolean;
  assigned: boolean;
  capabilities: string[];
};
export default async function PosEmployeesPage() {
  const context = await requirePosAccess();
  const location = await getSelectedPosLocation(context);
  const staff = (location && context.capabilities.includes("staff.manage")
    ? await getPosStaff(location.id)
    : []) as unknown as Staff[];
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Employees & staff</h1>
          <p>
            Server-enforced roles, location assignments and POS capabilities
          </p>
        </div>
      </header>
      {location && context.capabilities.includes("staff.manage") ? (
        <StaffTable
          locationId={location.id}
          staff={staff}
          allCapabilities={context.capabilities}
        />
      ) : (
        <section className="pos-panel pos-empty">
          You do not have staff management permission.
        </section>
      )}
      <section className="pos-panel" style={{ marginTop: 16 }}>
        <strong>Credential security</strong>
        <p>
          Credentials remain in Supabase Auth. Passwords are never stored in
          Reyon tables or exposed to POS managers. New user invitations must use
          the approved Supabase Auth invitation/recovery flow.
        </p>
      </section>
    </div>
  );
}
