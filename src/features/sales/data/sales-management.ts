import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompletedSale = Readonly<{
  id: string;
  orderId: string;
  orderNumber: string;
  invoiceNumber: number;
  receiptNumber: number | null;
  completedAt: string;
  productSales: number;
  deliveryCharge: number;
  grandTotal: number;
  currency: "BDT";
  paymentMethod: string;
  paymentState: string;
}>;

export async function getCompletedSales() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_sales_register");
  if (error) throw new Error("Sales register could not be loaded.");
  return (data ?? []) as CompletedSale[];
}

export type DailySalesControl = Readonly<{
  businessDate: string;
  completedSalesCount: number;
  productSales: number;
  deliveryCharges: number;
  grandTotal: number;
  discounts: number;
  currency: "BDT";
}>;

export async function getDailySalesControl() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc(
    "admin_daily_sales_reconciliation",
    {
      p_from: null,
      p_to: null,
    },
  );
  if (error) throw new Error("Daily sales control could not be loaded.");
  return (data ?? []) as DailySalesControl[];
}
