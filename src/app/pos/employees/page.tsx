import { StaffTable } from "@/features/pos/components/staff-table";
import {
  getSelectedPosLocation,
  requirePosCapability,
} from "@/features/pos/data/pos-access";
import { getPosStaff } from "@/features/pos/data/pos-data";
type Staff = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  active: boolean;
  assigned: boolean;
  capabilities: string[];
};
export default async function PosEmployeesPage() {
  const context = await requirePosCapability("staff.manage");
  const location = await getSelectedPosLocation(context);
  const staff = (location
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
      {location ? (
        <StaffTable
          locationId={location.id}
          locations={context.locations}
          staff={staff}
          allCapabilities={context.capabilities}
          canManageAdministrators={context.role === "super-admin"}
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
