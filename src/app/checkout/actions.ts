"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CheckoutAddress = Readonly<{
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
export type AddressState = {
  success?: string;
  error?: string;
  fieldErrors?: Partial<Record<keyof CheckoutAddress, string>>;
};
const value = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
export async function saveCheckoutAddress(
  _state: AddressState,
  form: FormData,
): Promise<AddressState> {
  const token = (await cookies()).get("reyon_cart")?.value;
  if (!token) return { error: "Your active bag could not be found." };
  const required: readonly (keyof CheckoutAddress)[] = [
    "fullName",
    "phone",
    "houseNo",
    "road",
    "villageCity",
    "thanaUpazila",
    "district",
    "division",
  ];
  const fieldErrors: Partial<Record<keyof CheckoutAddress, string>> =
    Object.fromEntries(
      required
        .filter((key) => !value(form, key))
        .map((key) => [key, "This field is required."]),
    );
  if (Object.keys(fieldErrors).length)
    return { error: "Complete the highlighted address fields.", fieldErrors };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("checkout_save_address", {
    p_access_token: token,
    p_full_name: value(form, "fullName"),
    p_phone: value(form, "phone"),
    p_flat_no: value(form, "flatNo") || null,
    p_house_no: value(form, "houseNo"),
    p_road: value(form, "road"),
    p_village_city: value(form, "villageCity"),
    p_thana_upazila: value(form, "thanaUpazila"),
    p_district: value(form, "district"),
    p_division: value(form, "division"),
  });
  if (error)
    return {
      error: /active cart/i.test(error.message)
        ? "Your shopping bag expired. Return to your bag and try again."
        : "The address could not be saved. Review the information and try again.",
    };
  revalidatePath("/checkout");
  return { success: "Delivery address saved securely." };
}

export async function getCheckoutAddress(): Promise<CheckoutAddress | null> {
  const token = (await cookies()).get("reyon_cart")?.value;
  if (!token) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("checkout_address", {
    p_access_token: token,
  });
  return error || !data ? null : (data as CheckoutAddress);
}

export async function savePaymentSelection(
  _state: AddressState,
  form: FormData,
): Promise<AddressState> {
  const token = (await cookies()).get("reyon_cart")?.value;
  if (!token) return { error: "Your active bag could not be found." };
  const methodId = value(form, "paymentMethod");
  if (!methodId) return { error: "Choose an available payment method." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("checkout_select_payment", {
    p_access_token: token,
    p_method_id: methodId,
    p_transaction_reference: value(form, "transactionReference") || null,
  });
  if (error)
    return {
      error:
        "This payment method is not ready or required evidence is missing.",
    };
  revalidatePath("/checkout");
  return { success: "Payment method saved." };
}
