"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MediaActionState = Readonly<{ success?: string; error?: string }>;
const approvedMime = ["image/jpeg", "image/png", "image/webp"] as const;
const extension: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const detectedMime: Readonly<Record<string, string>> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const refresh = (slug?: string) => {
  revalidatePath("/admin/media");
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/search");
  if (slug) revalidatePath(`/products/${slug}`);
};

async function validatedImage(form: FormData) {
  if (form.get("licensingConfirmed") !== "on")
    throw new Error("Confirm that REYON is licensed to use this image.");
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0)
    throw new Error("Choose an image to upload.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Use an image no larger than 5 MB.");
  if (!approvedMime.includes(file.type as (typeof approvedMime)[number]))
    throw new Error("Use a JPG, PNG, or WebP image.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  if (!metadata.format || detectedMime[metadata.format] !== file.type)
    throw new Error("The file content does not match its image type.");
  if (
    !metadata.width ||
    !metadata.height ||
    metadata.width < 800 ||
    metadata.height < 800
  )
    throw new Error("Product images must be at least 800 × 800 pixels.");
  return { file, buffer, width: metadata.width, height: metadata.height };
}

async function upload(form: FormData) {
  const productId = text(form, "productId");
  if (!productId) throw new Error("Choose a product.");
  const image = await validatedImage(form);
  const objectPath = `${productId}/${randomUUID()}.${extension[image.file.type]}`;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage
    .from("product-media")
    .upload(objectPath, image.buffer, {
      contentType: image.file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) throw new Error("The image upload failed. Please try again.");
  const url = supabase.storage.from("product-media").getPublicUrl(objectPath)
    .data.publicUrl;
  return { supabase, objectPath, url, ...image };
}

async function removeIfUnreferenced(objectPath: string | null) {
  if (!objectPath) return;
  const supabase = await createSupabaseServerClient();
  const { data: referenced } = await supabase.rpc(
    "admin_media_object_is_referenced",
    {
      p_object_path: objectPath,
    },
  );
  if (!referenced)
    await supabase.storage.from("product-media").remove([objectPath]);
}

export async function addProductImage(
  _state: MediaActionState,
  form: FormData,
): Promise<MediaActionState> {
  try {
    const alt = text(form, "altText") || text(form, "defaultAlt");
    if (!alt) throw new Error("ALT text is required.");
    const uploaded = await upload(form);
    const { error } = await uploaded.supabase.rpc("admin_add_product_media", {
      p_product_id: text(form, "productId"),
      p_url: uploaded.url,
      p_object_path: uploaded.objectPath,
      p_alt_text: alt,
      p_mime_type: uploaded.file.type,
      p_width: uploaded.width,
      p_height: uploaded.height,
    });
    if (error) {
      await removeIfUnreferenced(uploaded.objectPath);
      throw new Error(
        error.message.includes("12 images")
          ? error.message
          : "The image could not be saved.",
      );
    }
    refresh(text(form, "slug"));
    return { success: "The product image was added." };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The image could not be added.",
    };
  }
}

export async function updateProductImage(
  _state: MediaActionState,
  form: FormData,
): Promise<MediaActionState> {
  const alt = text(form, "altText");
  if (!alt) return { error: "ALT text is required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_product_media", {
    p_media_id: text(form, "mediaId"),
    p_alt_text: alt,
    p_display_order: Math.max(
      0,
      Number.parseInt(text(form, "displayOrder") || "0", 10) || 0,
    ),
    p_is_primary: form.get("isPrimary") === "on",
  });
  if (error) return { error: "The image details could not be saved." };
  refresh(text(form, "slug"));
  return { success: "The image details were updated." };
}

export async function replaceProductImage(
  _state: MediaActionState,
  form: FormData,
): Promise<MediaActionState> {
  try {
    const alt = text(form, "altText");
    if (!alt) throw new Error("ALT text is required.");
    const uploaded = await upload(form);
    const { data: oldPath, error } = await uploaded.supabase.rpc(
      "admin_replace_product_media",
      {
        p_media_id: text(form, "mediaId"),
        p_url: uploaded.url,
        p_object_path: uploaded.objectPath,
        p_alt_text: alt,
        p_mime_type: uploaded.file.type,
        p_width: uploaded.width,
        p_height: uploaded.height,
      },
    );
    if (error) {
      await removeIfUnreferenced(uploaded.objectPath);
      throw new Error("The replacement image could not be saved.");
    }
    await removeIfUnreferenced(oldPath as string | null);
    refresh(text(form, "slug"));
    return {
      success: "The image was replaced without changing the product record.",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The image could not be replaced.",
    };
  }
}

export async function removeProductImage(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: oldPath, error } = await supabase.rpc(
    "admin_remove_product_media",
    {
      p_media_id: text(form, "mediaId"),
    },
  );
  if (error)
    throw new Error(
      error.message.includes("at least one")
        ? error.message
        : "The image could not be removed.",
    );
  await removeIfUnreferenced(oldPath as string | null);
  refresh(text(form, "slug"));
}
