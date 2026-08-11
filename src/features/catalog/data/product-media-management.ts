import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ManagedProductImage = Readonly<{
  id: string;
  url: string;
  objectPath: string | null;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  licensingConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type ManagedProductMedia = Readonly<{
  id: string;
  name: string;
  slug: string;
  status: string;
  brand: string;
  media: readonly ManagedProductImage[];
}>;

export async function listManagedProductMedia(): Promise<
  readonly ManagedProductMedia[]
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_product_media");
  if (error || !data) throw new Error("Unable to load Product Media.");
  return data as ManagedProductMedia[];
}
