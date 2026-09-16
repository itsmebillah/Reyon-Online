"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ChangePasswordState = Readonly<{ error?: string }>;

export async function changeOwnPassword(
  _state: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const currentPassword = formData.get("currentPassword");
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  if (
    typeof currentPassword !== "string" ||
    typeof password !== "string" ||
    typeof confirmation !== "string"
  )
    return { error: "Complete all password fields." };
  if (password.length < 8)
    return { error: "Use a new password with at least 8 characters." };
  if (password !== confirmation)
    return { error: "The new passwords do not match." };
  if (password === currentPassword)
    return { error: "Choose a password different from the current password." };

  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const email = claimsData?.claims?.email;
  if (claimsError || typeof email !== "string")
    return { error: "Your session has expired. Sign in and try again." };
  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (verificationError) return { error: "The current password is incorrect." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  redirect("/admin/login?password=changed");
}
