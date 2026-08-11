"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const cookieName = "reyon_cart";
const cartCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export type CartItem = Readonly<{
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  brandName: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string;
  imageAlt: string;
  available: number;
  isAvailable: boolean;
}>;
export type CartSummary = Readonly<{
  itemCount: number;
  items: readonly CartItem[];
  subtotal: number;
  expiresAt: string | null;
}>;
const empty: CartSummary = {
  itemCount: 0,
  items: [],
  subtotal: 0,
  expiresAt: null,
};

async function token(create = false) {
  const store = await cookies();
  const current = store.get(cookieName)?.value;
  if (current) return current;
  if (!create) return null;
  const value = crypto.randomUUID();
  store.set(cookieName, value, cartCookie);
  return value;
}

export async function getCartSummary(): Promise<CartSummary> {
  const accessToken = await token();
  if (!accessToken) return empty;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("cart_summary", {
    p_access_token: accessToken,
  });
  if (error || !data) return empty;
  return data as CartSummary;
}

export async function addCartItem(
  productId: string,
): Promise<{ success?: string; error?: string; count: number }> {
  const accessToken = await token(true);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("cart_add_item", {
    p_access_token: accessToken,
    p_product_id: productId,
    p_quantity: 1,
  });
  if (error)
    return {
      error: /maximum/i.test(error.message)
        ? "You can order up to 10 of this variant."
        : /stock|available/i.test(error.message)
          ? "This product is currently unavailable."
          : "We could not update your bag.",
      count: (await getCartSummary()).itemCount,
    };
  revalidatePath("/cart");
  return {
    success: "Added to your bag",
    count: (await getCartSummary()).itemCount,
  };
}

export async function setCartQuantity(form: FormData) {
  const accessToken = await token();
  if (!accessToken) return;
  const supabase = await createSupabaseServerClient();
  const quantity = Number(form.get("quantity"));
  await supabase.rpc("cart_set_quantity", {
    p_access_token: accessToken,
    p_variant_id: String(form.get("variantId") ?? ""),
    p_quantity: quantity,
  });
  revalidatePath("/cart");
}
