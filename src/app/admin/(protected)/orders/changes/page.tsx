import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
async function acknowledge(form: FormData) {
  "use server";
  const s = await createSupabaseServerClient();
  await s.rpc("admin_acknowledge_order_change", {
    p_request_id: String(form.get("id")),
    p_note: String(form.get("note")),
  });
  revalidatePath("/admin/orders/changes");
}
export default async function Page() {
  const s = await createSupabaseServerClient();
  const { data } = await s.rpc("admin_order_change_queue");
  const rows = (data ?? []) as {
    id: string;
    orderNumber: string;
    orderState: string;
    kind: string;
    request: string;
  }[];
  return (
    <section className="admin-dashboard catalog-admin">
      <header>
        <p className="eyebrow">Append-only operations</p>
        <h1>Correction & Return Boundaries</h1>
        <p>
          Requests create auditable work; historical order facts are never
          overwritten.
        </p>
      </header>
      {rows.length ? (
        rows.map((r) => (
          <article className="admin-module-card" key={r.id}>
            <span>{r.kind}</span>
            <h2>{r.orderNumber}</h2>
            <p>
              {r.orderState} · {r.request}
            </p>
            <form action={acknowledge} className="admin-auth-form">
              <input type="hidden" name="id" value={r.id} />
              <label>
                Internal acknowledgement note
                <textarea name="note" required />
              </label>
              <button className="button button--primary">
                {r.kind === "return-refund"
                  ? "Hand off to Return/Refund"
                  : "Acknowledge correction"}
              </button>
            </form>
          </article>
        ))
      ) : (
        <p className="admin-empty">No open correction or return requests.</p>
      )}
    </section>
  );
}
