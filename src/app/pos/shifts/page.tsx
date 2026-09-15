import { ShiftControls } from "@/features/pos/components/shift-controls";
import {
  getSelectedPosLocation,
  requirePosAccess,
} from "@/features/pos/data/pos-access";
import { getPosShifts } from "@/features/pos/data/pos-data";
export default async function PosShiftsPage() {
  const context = await requirePosAccess();
  const location = await getSelectedPosLocation(context);
  const register = location?.registers[0];
  const shifts = location ? await getPosShifts(location.id) : [];
  const open = shifts.find((s) => !s.closedAt && s.registerId === register?.id);
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Register & shifts</h1>
          <p>Opening cash, tender totals, closing count and variance</p>
        </div>
        {open ? (
          <span className="pos-badge">Shift open</span>
        ) : (
          <span className="pos-badge pos-badge--danger">Closed</span>
        )}
      </header>
      {register && <ShiftControls register={register} openShift={open} />}
      <section className="pos-panel pos-table-wrap" style={{ marginTop: 16 }}>
        <table className="pos-table">
          <thead>
            <tr>
              <th>Register</th>
              <th>Opened</th>
              <th>Opening cash</th>
              <th>Sales</th>
              <th>Closed</th>
              <th>Expected</th>
              <th>Counted</th>
              <th>Variance</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id}>
                <td>{s.register}</td>
                <td>{new Date(s.openedAt).toLocaleString("en-BD")}</td>
                <td>৳{Number(s.openingCash).toLocaleString()}</td>
                <td>৳{Number(s.sales).toLocaleString()}</td>
                <td>
                  {s.closedAt
                    ? new Date(s.closedAt).toLocaleString("en-BD")
                    : "Open"}
                </td>
                <td>
                  {s.expectedCash == null
                    ? "—"
                    : `৳${Number(s.expectedCash).toLocaleString()}`}
                </td>
                <td>
                  {s.closingCash == null
                    ? "—"
                    : `৳${Number(s.closingCash).toLocaleString()}`}
                </td>
                <td>
                  {s.variance == null
                    ? "—"
                    : `৳${Number(s.variance).toLocaleString()}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
