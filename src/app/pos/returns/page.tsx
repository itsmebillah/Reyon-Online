import Link from "next/link";
import { requirePosCapability } from "@/features/pos/data/pos-access";
export default async function PosReturnsPage() {
  await requirePosCapability("pos.refund");
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Returns & refunds</h1>
          <p>
            Returns use Reyon’s canonical inspection, stock restoration and
            refund evidence
          </p>
        </div>
      </header>
      <section className="pos-panel">
        <>
          <h2>Canonical return workflow</h2>
          <p>
            Locate the sale in Sales & invoices, verify the receipt, then use
            Reyon’s existing return review workflow. Accepted physical items
            restore the same inventory ledger used by POS and the website.
          </p>
          <div className="pos-toolbar">
            <Link className="pos-button" href="/pos/sales">
              Find POS sale
            </Link>
            <Link
              className="pos-button pos-button--ghost"
              href="/admin/returns"
            >
              Open return operations
            </Link>
          </div>
        </>
      </section>
    </div>
  );
}
