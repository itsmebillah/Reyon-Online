"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AddressState = { success?: string; error?: string };
const value = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
export async function saveCheckoutAddress(
  _state: AddressState,
  form: FormData,
): Promise<AddressState> {
  const token = (await cookies()).get("reyon_cart")?.value;
  if (!token) return { error: "Your active bag could not be found." };
  const required = [
    "fullName",
    "phone",
    "houseNo",
    "road",
    "villageCity",
    "thanaUpazila",
    "district",
    "division",
  ];
  if (required.some((key) => !value(form, key)))
    return { error: "Complete every required address field." };
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
      error:
        "The address could not be saved. Review the information and try again.",
    };
  revalidatePath("/checkout");
  return { success: "Delivery address saved securely." };
}
