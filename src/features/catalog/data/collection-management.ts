import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ManagedCollectionPin = Readonly<{
  productId: string;
  productName: string;
  displayOrder: number;
}>;

export type ManagedCollection = Readonly<{
  id: string;
  key: string;
  name: string;
  strategy: string;
  isEnabled: boolean;
  itemLimit: number;
  displayOrder: number;
  rankingPeriodDays: number | null;
  lowStockThreshold: number | null;
  createdAt: string;
  updatedAt: string;
  pins: readonly ManagedCollectionPin[];
}>;

export async function listManagedCollections(): Promise<
  readonly ManagedCollection[]
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_product_collections");
  if (error || !data) throw new Error("Unable to load homepage collections.");
  return data as ManagedCollection[];
}
