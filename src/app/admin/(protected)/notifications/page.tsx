import { createSupabaseServerClient } from "@/lib/supabase/server";
export default async function NotificationsPage() {
  const s = await createSupabaseServerClient();
  const { data } = await s.rpc("admin_notification_outbox");
  const rows = (data ?? []) as {
    id: string;
    event: string;
    audience: string;
    orderNumber: string | null;
    status: string;
    createdAt: string;
  }[];
  return (
    <section className="admin-dashboard catalog-admin">
      <header>
        <p className="eyebrow">Event delivery</p>
        <h1>Notification Outbox</h1>
        <p>
          Provider-neutral customer and administrator events. Provider failures
          never change order state.
        </p>
      </header>
      <article className="admin-module-card">
        <span>Outbox</span>
        <h2>{rows.length} events</h2>
        {rows.length ? (
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Order</th>
                  <th>Audience</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.event}</td>
                    <td>{r.orderNumber ?? "System"}</td>
                    <td>{r.audience}</td>
                    <td>{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">No notification events yet.</p>
        )}
      </article>
    </section>
  );
}
