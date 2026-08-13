import "server-only";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CheckoutOrderSuccess = Readonly<{
  orderReference: string;
  status: string;
  paymentMethod: string;
  totalAmount: number;
  currency: "BDT";
  deliveryZone: string;
  address: Readonly<{
    fullName: string;
    phone: string;
    flatNo: string | null;
    houseNo: string;
    road: string;
    villageCity: string;
    thanaUpazila: string;
    district: string;
    division: string;
  }>;
}>;

export async function getCheckoutOrderSuccess() {
  const accessToken = (await cookies()).get("reyon_cart")?.value;
  if (!accessToken) return null;
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("checkout_order_success", {
    p_access_token: accessToken,
  });
  if (error || !data) return null;
  return data as CheckoutOrderSuccess;
}
