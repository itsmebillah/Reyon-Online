import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type ProductOptions = Readonly<{
  brands: readonly Readonly<{ id: string; name: string; slug: string }>[];
  categories: readonly Readonly<{
    id: string;
    name: string;
    slug: string;
    parentId: string | null;
  }>[];
  products: readonly Readonly<{
    id: string;
    name: string;
    slug: string;
    status: string;
    brand: string;
    category: string;
  }>[];
}>;
export async function getProductOptions(): Promise<ProductOptions> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_catalog_options");
  if (error || !data) throw new Error("Unable to load Product Management.");
  return data as ProductOptions;
}
