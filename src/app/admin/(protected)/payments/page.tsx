import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
async function save(form: FormData) {
  "use server";
  const s = await createSupabaseServerClient();
  const { error } = await s.rpc("admin_update_payment_method", {
    p_method_id: String(form.get("id")),
    p_is_visible: form.get("visible") === "on",
    p_is_selectable: form.get("selectable") === "on",
    p_instructions: String(form.get("instructions") ?? ""),
    p_account_reference: String(form.get("accountReference") ?? ""),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
}
async function decide(form: FormData) {
  "use server";
  const s = await createSupabaseServerClient();
  const { error } = await s.rpc("admin_decide_manual_payment", {
    p_order_id: String(form.get("orderId")),
    p_decision: String(form.get("decision")),
    p_note: String(form.get("note") ?? "") || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/payments");
  revalidatePath("/admin/orders");
}
export default async function Page() {
  const s = await createSupabaseServerClient();
  const [methodsResult, pendingResult] = await Promise.all([
    s.rpc("admin_payment_methods"),
    s.rpc("admin_pending_manual_payments"),
  ]);
  if (methodsResult.error || pendingResult.error)
    throw new Error("Payment operations could not be loaded.");
  const data = methodsResult.data;
  const pendingData = pendingResult.data;
  const methods = (data ?? []) as Array<{
    id: string;
    name: string;
    kind: string;
    isVisible: boolean;
    isSelectable: boolean;
    instructions: string | null;
    accountReference: string | null;
  }>;
  const pending = (pendingData ?? []) as Array<{
    orderId: string;
    orderNumber: string;
    orderState: string;
    customerName: string;
    method: string;
    amount: number;
    currency: string;
    reference: string;
    paymentState: string;
  }>;
  return (
    <section className="admin-dashboard catalog-admin">
      <header>
        <p className="eyebrow">Checkout operations</p>
        <h1>Payment methods</h1>
        <p>
          Configure honest customer payment choices and manual-payment
          instructions. Card selection never records gateway success.
        </p>
      </header>
      <article className="admin-module-card">
        <span>Manual review</span>
        <h2>Pending payment evidence</h2>
        {pending.length ? (
          pending.map((item) => (
            <form
              action={decide}
              className="catalog-admin-form"
              key={item.orderId}
            >
              <input type="hidden" name="orderId" value={item.orderId} />
              <p>
                <strong>{item.orderNumber}</strong> · {item.customerName} ·{" "}
                {item.orderState}
              </p>
              <p>
                {item.method} ·{" "}
                {new Intl.NumberFormat("en-BD", {
                  style: "currency",
                  currency: "BDT",
                }).format(Number(item.amount))}{" "}
                · Reference <strong>{item.reference}</strong>
              </p>
              <label>
                Internal rejection note
                <textarea name="note" />
              </label>
              <div className="admin-quick-actions">
                <button
                  className="button button--primary"
                  name="decision"
                  value="verified"
                >
                  Verify evidence
                </button>
                <button
                  className="button button--secondary"
                  name="decision"
                  value="rejected"
                >
                  Reject evidence
                </button>
              </div>
            </form>
          ))
        ) : (
          <p className="admin-empty">
            No manual payment evidence is awaiting review.
          </p>
        )}
      </article>
      <div className="catalog-admin-grid">
        {methods.map((m) => (
          <article className="admin-module-card" key={m.id}>
            <span>{m.isSelectable ? "Selectable" : "Display only"}</span>
            <h2>{m.name}</h2>
            <form action={save} className="catalog-admin-form">
              <input name="id" type="hidden" value={m.id} />
              <label>
                Instructions
                <textarea
                  name="instructions"
                  defaultValue={m.instructions ?? ""}
                />
              </label>
              <label>
                Payment number / reference
                <input
                  name="accountReference"
                  defaultValue={m.accountReference ?? ""}
                />
              </label>
              <label className="publish-choice">
                <input
                  name="visible"
                  type="checkbox"
                  defaultChecked={m.isVisible}
                />
                <span>
                  <strong>Visible at checkout</strong>
                </span>
              </label>
              <label className="publish-choice">
                <input
                  name="selectable"
                  type="checkbox"
                  defaultChecked={m.isSelectable}
                />
                <span>
                  <strong>Customer can select</strong>
                </span>
              </label>
              <button className="button button--primary">Save method</button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
