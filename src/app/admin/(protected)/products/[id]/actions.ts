"use server";
import { revalidatePath } from "next/cache";
import { requireReyonAdmin } from "@/features/access/data/admin-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { watchFields } from "@/features/catalog/domain/watch";
export type EditState = { error?: string; success?: string };
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export async function saveDetails(
  _s: EditState,
  f: FormData,
): Promise<EditState> {
  await requireReyonAdmin();
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_save_watch_details", {
    p_product_id: text(f, "productId"),
    p_specifications: Object.fromEntries(
      Object.keys(watchFields).map((k) => [k, text(f, k)]),
    ),
    p_description: text(f, "description"),
  });
  if (error)
    return {
      error: "Unable to save. Check the watch category and required model.",
    };
  revalidatePath("/admin/products/" + text(f, "productId"));
  return { success: "Watch details saved." };
}
export async function saveVariant(
  _s: EditState,
  f: FormData,
): Promise<EditState> {
  await requireReyonAdmin();
  const price = Number(text(f, "price")),
    compare = text(f, "compareAt");
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    (compare && (!Number.isFinite(Number(compare)) || Number(compare) <= price))
  )
    return { error: "Enter a positive price and a higher comparison price." };
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("admin_save_watch_variant", {
    p_product_id: text(f, "productId"),
    p_variant_id: text(f, "variantId") || null,
    p_label: text(f, "label"),
    p_sku: text(f, "sku"),
    p_price: price,
    p_compare_at: compare ? Number(compare) : null,
  });
  if (error)
    return {
      error:
        "Unable to save this variant. Check its label, unique SKU and price.",
    };
  revalidatePath("/admin/products/" + text(f, "productId"));
  return { success: "Variant saved. Manage its stock in Inventory." };
}
