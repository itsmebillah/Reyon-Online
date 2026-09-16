import Link from "next/link";
import { requirePosCapability } from "@/features/pos/data/pos-access";

const workflows = [
  {
    href: "/admin/suppliers",
    title: "Suppliers",
    description: "Manage the canonical supplier directory and contacts.",
  },
  {
    href: "/admin/purchases",
    title: "Purchase orders",
    description: "Create and approve purchase orders against Reyon inventory.",
  },
  {
    href: "/admin/purchases/receiving",
    title: "Receive stock",
    description:
      "Inspect receipts and post stock into the same ledger used by POS and web sales.",
  },
  {
    href: "/admin/purchases/returns",
    title: "Purchase returns",
    description:
      "Record supplier returns with authoritative valuation evidence.",
  },
  {
    href: "/admin/purchases/payments",
    title: "Supplier payments",
    description: "Record settlements against canonical supplier payables.",
  },
] as const;

export default async function PosPurchasingPage() {
  await requirePosCapability("purchasing.manage");

  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Suppliers & purchasing</h1>
          <p>
            Stock intake uses Reyon&apos;s canonical purchasing, valuation and
            inventory ledger
          </p>
        </div>
      </header>
      <section className="pos-dashboard-grid">
        {workflows.map((workflow) => (
          <article className="pos-panel" key={workflow.href}>
            <h2>{workflow.title}</h2>
            <p>{workflow.description}</p>
            <Link className="pos-button pos-button--ghost" href={workflow.href}>
              Open {workflow.title.toLowerCase()}
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
