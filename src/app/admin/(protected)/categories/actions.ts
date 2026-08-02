"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CategoryActionState = Readonly<{
  success?: string;
  error?: string;
}>;
const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const nullable = (form: FormData, key: string) => text(form, key) || null;
const slugify = (input: string) =>
  input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const order = (form: FormData) =>
  Number.parseInt(text(form, "displayOrder") || "0", 10);
const friendly = (message: string) =>
  /duplicate|unique/i.test(message)
    ? "A category with that name or URL already exists."
    : /descendant|self/i.test(message)
      ? "Choose a different parent category to keep the hierarchy valid."
      : "The category could not be saved. Review the information and try again.";
const refresh = () => {
  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  revalidatePath("/");
  revalidatePath("/shop");
};

export async function createCategory(
  _state: CategoryActionState,
  form: FormData,
): Promise<CategoryActionState> {
  const name = text(form, "name");
  if (!name) return { error: "Category name is required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_create_category_v2", {
    p_name: name,
    p_slug: slugify(name),
    p_description: nullable(form, "description"),
    p_parent_id: nullable(form, "parentId"),
    p_display_order: order(form),
    p_is_visible: form.get("isVisible") === "on",
  });
  if (error) return { error: friendly(error.message) };
  refresh();
  return { success: `${name} was created.` };
}
export async function updateCategory(
  _state: CategoryActionState,
  form: FormData,
): Promise<CategoryActionState> {
  const id = text(form, "categoryId"),
    name = text(form, "name");
  if (!id || !name) return { error: "Category name is required." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_update_category", {
    p_category_id: id,
    p_name: name,
    p_slug: slugify(name),
    p_description: nullable(form, "description"),
    p_parent_id: nullable(form, "parentId"),
    p_display_order: order(form),
    p_is_visible: form.get("isVisible") === "on",
  });
  if (error) return { error: friendly(error.message) };
  refresh();
  return { success: `${name} was updated.` };
}
export async function setCategoryArchived(form: FormData) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_category_archived", {
    p_category_id: text(form, "categoryId"),
    p_archived: text(form, "archived") === "true",
  });
  if (error) throw new Error("The category status could not be changed.");
  refresh();
}
