import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ExpiredReservationAction,
  ReviewResolutionAction,
} from "./review-actions";
export default async function ReviewsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_order_review_queue");
  if (error) throw new Error("Order review queue could not be loaded.");
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
      <ExpiredReservationAction />
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
            <ReviewResolutionAction
              caseId={item.id}
              orderId={item.orderId}
              type={item.type}
            />
          </article>
        ))
      ) : (
        <p className="admin-empty">No open order reviews.</p>
      )}
    </section>
  );
}
