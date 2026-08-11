import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type InventoryDashboard = Readonly<{
  locations: readonly Readonly<{ id: string; name: string; code: string }>[];
  variants: readonly Readonly<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    variantLabel: string;
    sku: string;
    status: string;
    onHand: number;
    reserved: number;
    available: number;
    stockItemId: string | null;
  }>[];
  movements: readonly Readonly<{
    id: string;
    movementType: string;
    occurredAt: string;
    recordedAt: string;
    sourceReference: string;
    reason: string | null;
    actor: string | null;
    reversesMovementId: string | null;
    quantity: number;
    productName: string;
    variantLabel: string;
    sku: string;
    locationName: string;
    isReversed: boolean;
  }>[];
}>;

export async function getInventoryDashboard(): Promise<InventoryDashboard> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_inventory_dashboard");
  if (error || !data) throw new Error("Unable to load Inventory Entry.");
  return data as InventoryDashboard;
}
