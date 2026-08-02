import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ManagedCategory = Readonly<{
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  displayOrder: number;
  isVisible: boolean;
  archivedAt: string | null;
}>;

export async function listManagedCategories(): Promise<
  readonly ManagedCategory[]
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_categories");
  if (error || !data) throw new Error("Unable to load categories.");
  return data as ManagedCategory[];
}
