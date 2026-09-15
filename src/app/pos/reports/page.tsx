import {
  getSelectedPosLocation,
  requirePosAccess,
} from "@/features/pos/data/pos-access";
import { getPosDashboard } from "@/features/pos/data/pos-data";
type Tender = { method: string; amount: number };
type ProductReport = {
  name: string;
  sku: string;
  quantity: number;
  revenue: number;
};
type CashierReport = { cashier: string; sales: number; revenue: number };
type ChannelReport = { channel: string; sales: number; revenue: number };
export default async function PosReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const context = await requirePosAccess();
  const location = await getSelectedPosLocation(context);
  const query = await searchParams;
  const from = query.from ? `${query.from}T00:00:00+06:00` : undefined;
  const to = query.to ? `${query.to}T23:59:59+06:00` : undefined;
  const data = location ? await getPosDashboard(location.id, from, to) : {};
  const tenders = (data.tenders ?? []) as Tender[];
  const products = (data.products ?? []) as ProductReport[];
  const cashiers = (data.cashiers ?? []) as CashierReport[];
  const channels = (data.channels ?? []) as ChannelReport[];
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Reports</h1>
          <p>Today’s authoritative POS performance at {location?.name}</p>
        </div>
      </header>
      <form className="pos-toolbar">
        <div className="pos-field">
          <label>From</label>
          <input type="date" name="from" defaultValue={query.from} />
        </div>
        <div className="pos-field">
          <label>To</label>
          <input type="date" name="to" defaultValue={query.to} />
        </div>
        <button className="pos-button pos-button--ghost">
          Apply date range
        </button>
      </form>
      <section className="pos-stats">
        <article className="pos-stat">
          <small>Sales</small>
          <strong>{Number(data.salesCount ?? 0)}</strong>
        </article>
        <article className="pos-stat">
          <small>Revenue</small>
          <strong>৳{Number(data.revenue ?? 0).toLocaleString()}</strong>
        </article>
        <article className="pos-stat">
          <small>Tax</small>
          <strong>৳{Number(data.tax ?? 0).toLocaleString()}</strong>
        </article>
        <article className="pos-stat">
          <small>Due</small>
          <strong>৳{Number(data.due ?? 0).toLocaleString()}</strong>
        </article>
      </section>
      <section className="pos-panel">
        <h2>Payment / tender breakdown</h2>
        {tenders.map((t) => (
          <p
            key={t.method}
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <span>{t.method}</span>
            <strong>৳{Number(t.amount).toLocaleString()}</strong>
          </p>
        ))}
        {!tenders.length && (
          <div className="pos-empty">No tenders recorded today.</div>
        )}
      </section>
      <div className="pos-action-grid" style={{ marginTop: 16 }}>
        <section className="pos-panel pos-table-wrap">
          <h2>Products sold</h2>
          <table className="pos-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item) => (
                <tr key={`${item.sku}-${item.name}`}>
                  <td>
                    {item.name}
                    <br />
                    <small>{item.sku}</small>
                  </td>
                  <td>{item.quantity}</td>
                  <td>৳{Number(item.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="pos-panel pos-table-wrap">
          <h2>Cashier performance</h2>
          <table className="pos-table">
            <thead>
              <tr>
                <th>Cashier</th>
                <th>Sales</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {cashiers.map((item) => (
                <tr key={item.cashier}>
                  <td>{item.cashier}</td>
                  <td>{item.sales}</td>
                  <td>৳{Number(item.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="pos-panel pos-table-wrap">
          <h2>Channel comparison</h2>
          <table className="pos-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Sales</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((item) => (
                <tr key={item.channel}>
                  <td>{item.channel}</td>
                  <td>{item.sales}</td>
                  <td>৳{Number(item.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
