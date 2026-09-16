"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = Readonly<{ error?: string }>;
export type ResetState = Readonly<{ error?: string; success?: string }>;

export async function requestPasswordReset(
  _state: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@"))
    return { error: "Enter the email address used for admin access." };
  const supabase = await createSupabaseServerClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://reyon-online.vercel.app";
  const redirectTo = new URL("/auth/callback", origin);
  redirectTo.searchParams.set("next", "/admin/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectTo.toString(),
  });
  if (error) {
    if (error.status === 429)
      return {
        error:
          "Reset emails are temporarily rate limited. Please wait a few minutes before requesting another link, then check your inbox and spam folder.",
      };
    return { error: "Unable to send a reset email. Please try again." };
  }
  return {
    success: "If this email has admin access, a reset link is on its way.",
  };
}

export async function updateAdminPassword(
  _state: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  if (typeof password !== "string" || password.length < 8)
    return { error: "Use a password with at least 8 characters." };
  if (password !== confirmation)
    return { error: "The passwords do not match." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error)
    return {
      error: "Unable to update the password. Request a new reset link.",
    };
  redirect("/admin/login?reset=complete");
}

export async function loginAdmin(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const requestedNext = formData.get("next");
  if (typeof email !== "string" || typeof password !== "string")
    return { error: "Enter your email address and password." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { error: "The email address or password is incorrect." };

  const { data: isAdmin, error: authorizationError } =
    await supabase.rpc("is_reyon_admin");
  if (authorizationError || !isAdmin) {
    await supabase.auth.signOut();
    redirect("/admin/access-denied");
  }

  const { data: contextData, error: contextError } =
    await supabase.rpc("pos_context");
  const context = contextData as {
    role: string;
    capabilities: string[];
  } | null;
  if (contextError || !context) {
    await supabase.auth.signOut();
    redirect("/admin/access-denied");
  }

  const requestedPos =
    typeof requestedNext === "string" &&
    (requestedNext === "/pos" || requestedNext.startsWith("/pos/"));
  const requestedAdmin =
    typeof requestedNext === "string" &&
    (requestedNext === "/admin" || requestedNext.startsWith("/admin/"));
  const hasPos = context.capabilities.includes("pos.access");
  const hasAdminWorkspace = ["admin", "super-admin"].includes(context.role);
  const destination = requestedPos
    ? hasPos
      ? requestedNext
      : "/admin/access-denied"
    : requestedAdmin
      ? hasAdminWorkspace
        ? requestedNext
        : hasPos
          ? "/pos/dashboard"
          : "/admin/access-denied"
      : hasAdminWorkspace
        ? "/admin"
        : hasPos
          ? "/pos/dashboard"
          : "/admin/access-denied";
  redirect(destination);
}

export async function logoutAdmin() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
