import {
  getSelectedPosLocation,
  requirePosAccess,
} from "@/features/pos/data/pos-access";
import { getPosShifts } from "@/features/pos/data/pos-data";
export default async function PosShiftsPage() {
  const context = await requirePosAccess();
  const location = await getSelectedPosLocation(context);
  const shifts = location ? await getPosShifts(location.id) : [];
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Register & shifts</h1>
          <p>Temporarily frozen for the current POS operating phase</p>
        </div>
        <span className="pos-badge">Future phase</span>
      </header>
      <section className="pos-panel">
        <h2>Shift operation is temporarily disabled</h2>
        <p>
          Sales can be completed without opening a register shift. Existing
          shift history and the underlying shift/cash-session architecture are
          preserved for a future phase.
        </p>
      </section>
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
