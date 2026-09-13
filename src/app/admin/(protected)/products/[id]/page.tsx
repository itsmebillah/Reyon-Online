import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DetailsForm, VariantForm, type WatchEdit } from "./forms";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("admin_watch_details", {
    p_product_id: id,
  });
  if (error) throw new Error("Unable to load watch details.");
  const watch = data as WatchEdit | null;
  return (
    <section className="admin-dashboard">
      <Link href="/admin/products">← Products</Link>
      <h1>Watch details & variants</h1>
      <p>
        Historical products are preserved. Only products with verified watch
        details and a watch category appear in the store.
      </p>
      <DetailsForm id={id} data={watch} />
      {watch && (
        <>
          <h2>Variants / prices</h2>
          {watch.variants.map((v) => (
            <VariantForm key={v.id} id={id} variant={v} />
          ))}
          <h2>Add a variant</h2>
          <VariantForm id={id} />
          <Link href="/admin/inventory">Manage stock →</Link>
        </>
      )}
    </section>
  );
}
