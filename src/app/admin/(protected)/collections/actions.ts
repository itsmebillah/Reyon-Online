"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CollectionActionState = Readonly<{
  success?: string;
  error?: string;
}>;
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const integer = (form: FormData, key: string, fallback = 0) => {
  const value = Number.parseInt(text(form, key), 10);
  return Number.isFinite(value) ? value : fallback;
};
const optionalInteger = (form: FormData, key: string) =>
  text(form, key) ? integer(form, key) : null;
const refresh = () => {
  revalidatePath("/admin/collections");
  revalidatePath("/");
  revalidatePath("/shop");
};

export async function updateCollection(
  _state: CollectionActionState,
  form: FormData,
): Promise<CollectionActionState> {
  const id = text(form, "collectionId");
  const name = text(form, "name");
  if (!id || !name) return { error: "Collection name is required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_product_collection", {
    p_collection_id: id,
    p_name: name,
    p_is_enabled: form.get("isEnabled") === "on",
    p_item_limit: integer(form, "itemLimit", 4),
    p_display_order: integer(form, "displayOrder"),
    p_ranking_period_days: optionalInteger(form, "rankingPeriodDays"),
    p_low_stock_threshold: optionalInteger(form, "lowStockThreshold"),
  });
  if (error) return { error: "The collection settings could not be saved." };
  refresh();
  return { success: `${name} was updated.` };
}

export async function addCollectionPin(
  _state: CollectionActionState,
  form: FormData,
): Promise<CollectionActionState> {
  const collectionId = text(form, "collectionId");
  const productId = text(form, "productId");
  if (!collectionId || !productId) return { error: "Choose a product to pin." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_collection_pin", {
    p_collection_id: collectionId,
    p_product_id: productId,
    p_is_pinned: true,
    p_display_order: integer(form, "pinOrder"),
  });
  if (error) return { error: "The product could not be pinned." };
  refresh();
  return { success: "The product was pinned." };
}

export async function removeCollectionPin(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_collection_pin", {
    p_collection_id: text(form, "collectionId"),
    p_product_id: text(form, "productId"),
    p_is_pinned: false,
    p_display_order: 0,
  });
  if (error) throw new Error("The pin could not be removed.");
  refresh();
}
