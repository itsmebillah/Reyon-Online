import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SupplierRelationship = Readonly<{
  id: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  supplierSku: string;
  minimumOrderQuantity: number;
  packSize: number;
  purchaseCost: number;
  currency: "BDT";
  leadTimeDays: number;
  isPreferred: boolean;
  isActive: boolean;
}>;
export type ManagedSupplier = Readonly<{
  id: string;
  code: string;
  displayName: string;
  legalName: string | null;
  status: "draft" | "active" | "suspended" | "archived";
  createdAt: string;
  updatedAt: string;
  relationships: readonly SupplierRelationship[];
}>;
export type PurchaseVariant = Readonly<{
  id: string;
  sku: string;
  label: string;
  productName: string;
}>;

export async function getSupplierManagement(): Promise<
  Readonly<{
    suppliers: readonly ManagedSupplier[];
    variants: readonly PurchaseVariant[];
  }>
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_supplier_management");
  if (error || !data) throw new Error("Unable to load supplier management.");
  return data as { suppliers: ManagedSupplier[]; variants: PurchaseVariant[] };
}
