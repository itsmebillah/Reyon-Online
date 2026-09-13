import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next");
  const destination = next?.startsWith("/admin/") ? next : "/admin/login";
  let error = "";
  if (code) {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.auth.exchangeCodeForSession(code);
    if (result.error) error = "reset=invalid";
  } else if (tokenHash && type === "recovery") {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (result.error) error = "reset=invalid";
  } else if (next?.startsWith("/admin/reset-password")) {
    error = "reset=missing";
  }
  const redirectUrl = new URL(destination, url.origin);
  if (error) redirectUrl.search = error;
  return NextResponse.redirect(redirectUrl);
}
