import Link from "next/link";
import { Search } from "lucide-react";
import {
  getSelectedPosLocation,
  requirePosAccess,
} from "@/features/pos/data/pos-access";
import { getPosSales } from "@/features/pos/data/pos-data";

type Sale = {
  orderId: string;
  orderNumber: string;
  invoiceNumber: number;
  occurredAt: string;
  customer: string;
  cashier: string;
  total: number;
  paid: number;
  due: number;
  paymentStatus: string;
};
export default async function PosSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const context = await requirePosAccess();
  const location = await getSelectedPosLocation(context);
  const { q = "" } = await searchParams;
  const sales = (location
    ? await getPosSales(location.id, q)
    : []) as unknown as Sale[];
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Sales & invoices</h1>
          <p>Canonical physical-POS order history</p>
        </div>
        <Link className="pos-button" href="/pos">
          New sale
        </Link>
      </header>
      <form className="pos-toolbar">
        <div className="pos-search">
          <Search size={17} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Order, customer, or phone…"
          />
        </div>
        <button className="pos-button pos-button--ghost">Search</button>
      </form>
      <section className="pos-panel pos-table-wrap">
        <table className="pos-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Cashier</th>
              <th>Status</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.orderId}>
                <td>
                  <strong>{sale.orderNumber}</strong>
                  <br />
                  <small>Invoice #{sale.invoiceNumber}</small>
                </td>
                <td>{new Date(sale.occurredAt).toLocaleString("en-BD")}</td>
                <td>{sale.customer}</td>
                <td>{sale.cashier}</td>
                <td>
                  <span
                    className={
                      sale.due > 0 ? "pos-badge pos-badge--danger" : "pos-badge"
                    }
                  >
                    {sale.paymentStatus}
                  </span>
                </td>
                <td>৳{Number(sale.total).toLocaleString()}</td>
                <td>
                  <Link
                    className="pos-button pos-button--ghost"
                    href={`/pos/sales/${sale.orderId}`}
                  >
                    Receipt
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sales.length && (
          <div className="pos-empty">No POS sales match this search.</div>
        )}
      </section>
    </div>
  );
}
