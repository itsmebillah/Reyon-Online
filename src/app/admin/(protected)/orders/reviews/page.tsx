import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveReview } from "./actions";
export default async function ReviewsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("admin_order_review_queue");
  const cases = (data ?? []) as {
    id: string;
    orderId: string;
    orderNumber: string;
    orderState: string;
    type: string;
    internalNote: string;
    customerName: string;
    cancellationReason: string | null;
  }[];
  return (
    <section className="admin-dashboard catalog-admin">
      <header>
        <p className="eyebrow">Order operations</p>
        <h1>Cancellation & Review Queue</h1>
        <p>
          Private operational exceptions and customer cancellation requests.
        </p>
      </header>
      {cases.length ? (
        cases.map((item) => (
          <article className="admin-module-card" key={item.id}>
            <span>{item.type}</span>
            <h2>
              <Link href={`/admin/orders/${item.orderId}`}>
                {item.orderNumber}
              </Link>
            </h2>
            <p>
              {item.customerName} · {item.orderState}
            </p>
            <p>{item.cancellationReason ?? item.internalNote}</p>
            <form action={resolveReview} className="admin-auth-form">
              <input type="hidden" name="caseId" value={item.id} />
              <label>
                Resolution
                <select name="resolution">
                  <option value="approved">Approve</option>
                  <option value="declined">Decline</option>
                  <option value="resolved">Resolve</option>
                  <option value="dismissed">Dismiss</option>
                </select>
              </label>
              <label>
                Internal resolution note
                <textarea name="note" required />
              </label>
              <button className="button button--primary">Resolve review</button>
            </form>
          </article>
        ))
      ) : (
        <p className="admin-empty">No open order reviews.</p>
      )}
    </section>
  );
}
