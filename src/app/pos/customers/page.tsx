import { Search } from "lucide-react";
import {
  getSelectedPosLocation,
  requirePosAccess,
} from "@/features/pos/data/pos-access";
import { getPosCustomers } from "@/features/pos/data/pos-data";
type Customer = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  salesCount: number;
  totalSpent: number;
};
export default async function PosCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const context = await requirePosAccess();
  const location = await getSelectedPosLocation(context);
  const { q = "" } = await searchParams;
  const customers = (location
    ? await getPosCustomers(location.id, q)
    : []) as unknown as Customer[];
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Customers</h1>
          <p>Canonical Reyon customer profiles and POS history</p>
        </div>
      </header>
      <form className="pos-toolbar">
        <div className="pos-search">
          <Search size={17} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search customer or phone…"
          />
        </div>
        <button className="pos-button pos-button--ghost">Search</button>
      </form>
      <section className="pos-panel pos-table-wrap">
        <table className="pos-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>POS sales</th>
              <th>POS spend</th>
              <th>Since</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                </td>
                <td>{c.phone}</td>
                <td>{c.salesCount}</td>
                <td>৳{Number(c.totalSpent).toLocaleString()}</td>
                <td>{new Date(c.createdAt).toLocaleDateString("en-BD")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!customers.length && (
          <div className="pos-empty">
            No customers found. A profile can be created during checkout.
          </div>
        )}
      </section>
    </div>
  );
}
