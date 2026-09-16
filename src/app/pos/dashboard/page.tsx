import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ReceiptText,
  ShoppingCart,
  Users,
} from "lucide-react";
import {
  getSelectedPosLocation,
  requirePosAccess,
} from "@/features/pos/data/pos-access";
import { getPosDashboard } from "@/features/pos/data/pos-data";

const amount = (value: unknown) =>
  `৳${Number(value ?? 0).toLocaleString("en-BD")}`;

export default async function PosDashboardPage() {
  const context = await requirePosAccess();
  const location = await getSelectedPosLocation(context);
  const data =
    location && context.capabilities.includes("reports.financial")
      ? await getPosDashboard(location.id)
      : {};
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Today at {location?.name ?? "your POS location"}</p>
        </div>
        {context.capabilities.includes("pos.checkout") && (
          <Link className="pos-button" href="/pos">
            <ShoppingCart size={17} /> New sale
          </Link>
        )}
      </header>
      <section className="pos-stats">
        <article className="pos-stat">
          <small>Sales today</small>
          <strong>{Number(data.salesCount ?? 0)}</strong>
        </article>
        <article className="pos-stat">
          <small>Revenue</small>
          <strong>{amount(data.revenue)}</strong>
        </article>
        <article className="pos-stat">
          <small>Discounts</small>
          <strong>{amount(data.discounts)}</strong>
        </article>
        <article className="pos-stat">
          <small>Outstanding due</small>
          <strong>{amount(data.due)}</strong>
        </article>
      </section>
      <section className="pos-action-grid">
        {context.capabilities.includes("pos.access") && (
          <Link className="pos-action-card" href="/pos/sales">
            <ReceiptText />
            <h2>Sales history</h2>
            <p>Find, inspect and reprint physical-POS sales.</p>
          </Link>
        )}
        {context.capabilities.includes("inventory.view") && (
          <Link className="pos-action-card" href="/pos/inventory">
            <Boxes />
            <h2>Inventory</h2>
            <p>Shared live stock from Reyon’s canonical ledger.</p>
          </Link>
        )}
        {context.capabilities.includes("reports.financial") && (
          <Link className="pos-action-card" href="/pos/reports">
            <BarChart3 />
            <h2>Reports</h2>
            <p>Revenue, tenders, products, cashiers and channels.</p>
          </Link>
        )}
        {context.capabilities.includes("customers.manage") && (
          <Link className="pos-action-card" href="/pos/customers">
            <Users />
            <h2>Customers</h2>
            <p>Customer search and POS sales associations.</p>
          </Link>
        )}
      </section>
    </div>
  );
}
