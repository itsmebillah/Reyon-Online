"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type BrandActionState = Readonly<{ success?: string; error?: string }>;
const initialError =
  "The brand could not be saved. Review the information and try again.";
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const nullable = (form: FormData, key: string) => text(form, key) || null;
const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function uploadLogo(brandId: string, form: FormData) {
  const logo = form.get("logo");
  if (!(logo instanceof File) || logo.size === 0) return null;
  if (logo.size > 2 * 1024 * 1024)
    throw new Error("Logo must be 2 MB or smaller.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(logo.type))
    throw new Error("Use a JPG, PNG, or WebP logo.");
  const extension =
    logo.type === "image/jpeg" ? "jpg" : logo.type.split("/")[1];
  const path = `${brandId}/logo.${extension}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage
    .from("brand-logos")
    .upload(path, logo, { contentType: logo.type, upsert: true });
  if (error) throw new Error("The logo upload failed. Please try again.");
  return path;
}

const friendly = (message: string) =>
  /duplicate|unique/i.test(message)
    ? "A brand with that name or URL already exists."
    : message || initialError;

export async function createBrand(
  _state: BrandActionState,
  form: FormData,
): Promise<BrandActionState> {
  const name = text(form, "name");
  if (!name) return { error: "Brand name is required." };
  const supabase = await createSupabaseServerClient();
  const { data: brandId, error } = await supabase.rpc("admin_create_brand_v2", {
    p_name: name,
    p_slug: slugify(name),
    p_description: nullable(form, "description"),
    p_website_url: nullable(form, "websiteUrl"),
    p_is_visible: form.get("isVisible") === "on",
  });
  if (error || !brandId)
    return { error: friendly(error?.message ?? initialError) };
  try {
    const logoPath = await uploadLogo(String(brandId), form);
    if (logoPath) {
      const { error: updateError } = await supabase.rpc("admin_update_brand", {
        p_brand_id: brandId,
        p_name: name,
        p_slug: slugify(name),
        p_description: nullable(form, "description"),
        p_website_url: nullable(form, "websiteUrl"),
        p_logo_path: logoPath,
        p_is_visible: form.get("isVisible") === "on",
      });
      if (updateError) throw new Error(initialError);
    }
  } catch (uploadError) {
    revalidatePath("/admin/brands");
    return {
      error: `${name} was created, but ${uploadError instanceof Error ? uploadError.message : "the logo could not be saved."}`,
    };
  }
  revalidatePath("/admin/brands");
  revalidatePath("/admin/catalog");
  return { success: `${name} was created.` };
}

export async function updateBrand(
  _state: BrandActionState,
  form: FormData,
): Promise<BrandActionState> {
  const id = text(form, "brandId");
  const name = text(form, "name");
  if (!id || !name) return { error: "Brand name is required." };
  try {
    const logoPath = await uploadLogo(id, form);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("admin_update_brand", {
      p_brand_id: id,
      p_name: name,
      p_slug: slugify(name),
      p_description: nullable(form, "description"),
      p_website_url: nullable(form, "websiteUrl"),
      p_logo_path: logoPath,
      p_is_visible: form.get("isVisible") === "on",
    });
    if (error) return { error: friendly(error.message) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : initialError };
  }
  revalidatePath("/admin/brands");
  revalidatePath("/admin/catalog");
  revalidatePath("/");
  revalidatePath("/shop");
  return { success: `${name} was updated.` };
}

export async function setBrandArchived(form: FormData) {
  const id = text(form, "brandId");
  const archived = text(form, "archived") === "true";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_brand_archived", {
    p_brand_id: id,
    p_archived: archived,
  });
  if (error) throw new Error("The brand status could not be changed.");
  revalidatePath("/admin/brands");
  revalidatePath("/admin/catalog");
  revalidatePath("/");
  revalidatePath("/shop");
}
