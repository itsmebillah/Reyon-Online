"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type ProductActionState = Readonly<{ success?: string; error?: string }>;
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim(),
  nullable = (f: FormData, k: string) => text(f, k) || null,
  money = (f: FormData, k: string) => {
    const v = text(f, k);
    return v ? Number(v) : null;
  },
  slugify = (v: string) =>
    v
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
const refresh = (slug?: string) => {
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/categories");
  revalidatePath("/search");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/products/${slug}`);
};
const friendly = (message: string) =>
  /duplicate|unique/i.test(message)
    ? "That product URL, SKU, barcode, or image is already in use."
    : /secure HTTPS image/i.test(message)
      ? "Enter a secure HTTPS image URL."
      : "The product could not be saved. Review the information and try again.";
export async function createProduct(
  _state: ProductActionState,
  form: FormData,
): Promise<ProductActionState> {
  const name = text(form, "name"),
    selling = money(form, "sellingPrice"),
    image = text(form, "imageUrl");
  if (!name || !text(form, "brandId") || !text(form, "categoryId"))
    return { error: "Product name, brand, and category are required." };
  if (selling === null || selling < 0)
    return { error: "Enter a valid selling price." };
  if (!image.startsWith("https://"))
    return { error: "Enter a secure HTTPS image URL." };
  const supabase = await createSupabaseServerClient();
  const publish = form.get("publish") === "on";
  const { error } = await supabase.rpc("admin_create_product", {
    p_name: name,
    p_slug: slugify(name),
    p_brand_id: text(form, "brandId"),
    p_category_id: text(form, "categoryId"),
    p_variant_type: text(form, "variantType"),
    p_variant_label: text(form, "variantLabel"),
    p_sku: nullable(form, "sku"),
    p_barcode: nullable(form, "barcode"),
    p_purchase_price: money(form, "purchasePrice"),
    p_selling_price: selling,
    p_compare_at_price: money(form, "compareAtPrice"),
    p_discount_price: money(form, "discountPrice"),
    p_image_url: image,
    p_image_alt: nullable(form, "imageAlt"),
    p_country_code: nullable(form, "countryCode"),
    p_product_code: nullable(form, "productCode"),
    p_publish: publish,
  });
  if (error) return { error: friendly(error.message) };
  refresh(slugify(name));
  return {
    success: publish
      ? `${name} is live on the customer website.`
      : `${name} was saved as a draft.`,
  };
}
export async function publishProduct(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_publish_product", {
    p_product_id: text(form, "productId"),
  });
  if (error) throw new Error("The product could not be published.");
  refresh(text(form, "slug"));
}
