import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
async function save(form: FormData) {
  "use server";
  const s = await createSupabaseServerClient();
  await s.rpc("admin_update_payment_method", {
    p_method_id: String(form.get("id")),
    p_is_visible: form.get("visible") === "on",
    p_is_selectable: form.get("selectable") === "on",
    p_instructions: String(form.get("instructions") ?? ""),
    p_account_reference: String(form.get("accountReference") ?? ""),
  });
  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
}
export default async function Page() {
  const s = await createSupabaseServerClient();
  const { data } = await s.rpc("admin_payment_methods");
  const methods = (data ?? []) as Array<{
    id: string;
    name: string;
    kind: string;
    isVisible: boolean;
    isSelectable: boolean;
    instructions: string | null;
    accountReference: string | null;
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
