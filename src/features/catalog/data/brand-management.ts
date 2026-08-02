import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ManagedBrand = Readonly<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  websiteUrl: string | null;
  logoPath: string | null;
  logoUrl: string | null;
  isVisible: boolean;
  archivedAt: string | null;
}>;

export async function listManagedBrands(): Promise<readonly ManagedBrand[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_brands");
  if (error || !data) throw new Error("Unable to load brands.");
  return (data as Omit<ManagedBrand, "logoUrl">[]).map((brand) => ({
    ...brand,
    logoUrl: brand.logoPath
      ? supabase.storage.from("brand-logos").getPublicUrl(brand.logoPath).data
          .publicUrl
      : null,
  }));
}
