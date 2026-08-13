import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReturnQueueItem = {
  id: string;
  orderNumber: string;
  state: string;
  reason: string;
  condition: string;
  shippingResponsibility: string;
  note: string;
  requestedAt: string;
  lineNumber: number;
  productName: string;
  variantLabel: string | null;
  quantity: number;
  evidence: { kind: string; reference: string }[];
};

export default async function ReturnsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_return_queue");
  const rows = (data ?? []) as ReturnQueueItem[];
  return (
    <section className="admin-dashboard catalog-admin">
      <header>
        <p className="eyebrow">Sprint 19 operations</p>
        <h1>Returns & refunds</h1>
        <p>
          Review attributable requests without changing original order or sales
          history.
        </p>
      </header>
      {error ? (
        <p className="admin-form-error">Return queue could not be loaded.</p>
      ) : rows.length ? (
        rows.map((row) => (
          <article className="admin-module-card" key={row.id}>
            <span>
              {row.state} · {row.reason}
            </span>
            <h2>{row.orderNumber}</h2>
            <p>
              {row.productName}
              {row.variantLabel ? ` — ${row.variantLabel}` : ""} · Quantity{" "}
              {row.quantity}
            </p>
            <p>
              Condition: {row.condition} · Shipping:{" "}
              {row.shippingResponsibility}
            </p>
            <p>{row.note}</p>
            {row.evidence.map((item) => (
              <p key={`${item.kind}-${item.reference}`}>
                {item.kind}: {item.reference}
              </p>
            ))}
          </article>
        ))
      ) : (
        <p className="admin-empty">No active return requests.</p>
      )}
    </section>
  );
}
