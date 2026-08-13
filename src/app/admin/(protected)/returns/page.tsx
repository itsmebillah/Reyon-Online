import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

async function transitionReturn(form: FormData) {
  "use server";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_transition_return", {
    p_request_id: String(form.get("requestId")),
    p_target_state: String(form.get("targetState")),
    p_note: String(form.get("note") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/returns");
}

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
            {row.state === "requested" ? (
              <ReturnAction
                row={row}
                target="under-review"
                label="Begin review"
              />
            ) : row.state === "under-review" ? (
              <div className="catalog-admin-grid">
                <ReturnAction
                  row={row}
                  target="approved"
                  label="Approve return"
                />
                <ReturnAction
                  row={row}
                  target="rejected"
                  label="Reject return"
                />
              </div>
            ) : row.state === "approved" ? (
              <ReturnAction
                row={row}
                target="awaiting-return"
                label="Await returned item"
              />
            ) : null}
          </article>
        ))
      ) : (
        <p className="admin-empty">No active return requests.</p>
      )}
    </section>
  );
}

function ReturnAction({
  row,
  target,
  label,
}: {
  row: ReturnQueueItem;
  target: string;
  label: string;
}) {
  return (
    <form action={transitionReturn} className="admin-auth-form">
      <input type="hidden" name="requestId" value={row.id} />
      <input type="hidden" name="targetState" value={target} />
      <label>
        Internal reason / operational note
        <textarea name="note" required />
      </label>
      <button
        className={
          target === "rejected"
            ? "button button--secondary"
            : "button button--primary"
        }
      >
        {label}
      </button>
    </form>
  );
}
