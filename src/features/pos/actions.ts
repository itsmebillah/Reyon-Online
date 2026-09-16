"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePosAccess } from "@/features/pos/data/pos-access";
import type { PosReceipt, PosTenderInput } from "@/features/pos/types";

export type PosActionResult<T = undefined> = Readonly<{
  data?: T;
  error?: string;
}>;

export async function selectPosLocation(locationId: string) {
  const context = await requirePosAccess();
  if (!context.locations.some((location) => location.id === locationId))
    return { error: "This location is not assigned to your account." };
  const store = await cookies();
  store.set("reyon-pos-location", locationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/pos",
    maxAge: 60 * 60 * 12,
  });
  revalidatePath("/pos", "layout");
  return {};
}

function message(error: { message: string } | null) {
  if (!error) return null;
  return error.message;
}

function employeeAuthError(error: unknown) {
  const detail =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (/already|registered|exists/i.test(`${code} ${detail}`))
    return "An account already exists for this email address.";
  if (
    /api key|jwt|credential|configuration|service.role|fetch|network/i.test(
      `${code} ${detail}`,
    )
  )
    return "Employee account could not be created. Please check the server configuration.";
  return "Employee account could not be created. Check the employee details and password requirements.";
}

export async function openPosShift(input: {
  registerId: string;
  openingCash: number;
}): Promise<PosActionResult<string>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("pos_open_shift", {
    p_register_id: input.registerId,
    p_opening_cash: input.openingCash,
  });
  if (error) return { error: message(error) ?? "Unable to open shift." };
  revalidatePath("/pos");
  revalidatePath("/pos/shifts");
  return { data: data as string };
}

export async function closePosShift(input: {
  shiftId: string;
  closingCash: number;
  note?: string;
}): Promise<PosActionResult<Record<string, number | string>>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("pos_close_shift", {
    p_shift_id: input.shiftId,
    p_closing_cash: input.closingCash,
    p_note: input.note ?? null,
  });
  if (error) return { error: message(error) ?? "Unable to close shift." };
  revalidatePath("/pos");
  revalidatePath("/pos/shifts");
  return { data: data as Record<string, number | string> };
}

export async function recordPosCashEvent(input: {
  shiftId: string;
  eventType: "cash-in" | "cash-out";
  amount: number;
  reason: string;
}): Promise<PosActionResult<string>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("pos_record_cash_event", {
    p_shift_id: input.shiftId,
    p_event_type: input.eventType,
    p_amount: input.amount,
    p_reason: input.reason,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (error)
    return { error: message(error) ?? "Cash event could not be recorded." };
  revalidatePath("/pos/shifts");
  return { data: data as string };
}

export async function completePosSale(input: {
  idempotencyKey: string;
  locationId: string;
  registerId: string;
  items: readonly { variantId: string; quantity: number }[];
  discountType: "FIXED" | "PERCENT";
  discountValue: number;
  taxRate: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  tenders: readonly PosTenderInput[];
}): Promise<PosActionResult<PosReceipt>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("pos_checkout", {
    p_request: input,
  });
  if (error) return { error: message(error) ?? "Sale could not be completed." };
  revalidatePath("/pos");
  revalidatePath("/pos/sales");
  revalidatePath("/pos/inventory");
  revalidatePath("/shop");
  revalidatePath("/search");
  return { data: data as PosReceipt };
}

export async function adjustPosInventory(input: {
  variantId: string;
  locationId: string;
  movementType: string;
  quantity: number;
  reason: string;
  reference?: string;
}): Promise<PosActionResult<string>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("pos_adjust_inventory", {
    p_variant_id: input.variantId,
    p_location_id: input.locationId,
    p_movement_type: input.movementType,
    p_quantity: input.quantity,
    p_reason: input.reason,
    p_reference: input.reference ?? null,
  });
  if (error) return { error: message(error) ?? "Inventory adjustment failed." };
  revalidatePath("/pos");
  revalidatePath("/pos/inventory");
  revalidatePath("/shop");
  return { data: data as string };
}

export async function importPosProducts(input: {
  locationId: string;
  idempotencyKey: string;
  rows: readonly Record<string, unknown>[];
}): Promise<PosActionResult<{ imported: number; productIds: string[] }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("pos_bulk_import_products", {
    p_location_id: input.locationId,
    p_idempotency_key: input.idempotencyKey,
    p_rows: input.rows,
  });
  if (error) return { error: message(error) ?? "Product import failed." };
  revalidatePath("/pos/products");
  revalidatePath("/pos");
  revalidatePath("/shop");
  return { data: data as { imported: number; productIds: string[] } };
}

export async function savePosSettings(input: {
  locationId: string;
  settings: Record<string, string | number>;
}): Promise<PosActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("pos_save_settings", {
    p_location_id: input.locationId,
    p_settings: input.settings,
  });
  if (error) return { error: message(error) ?? "Settings could not be saved." };
  revalidatePath("/pos/settings");
  return {};
}

export async function updatePosStaff(input: {
  userId: string;
  locationId: string;
  role: string;
  active: boolean;
  capabilities: readonly string[];
}): Promise<PosActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("pos_set_staff_access", {
    p_user_id: input.userId,
    p_location_id: input.locationId,
    p_role: input.role,
    p_active: input.active,
    p_capabilities: input.capabilities,
  });
  if (error)
    return { error: message(error) ?? "Staff access could not be updated." };
  revalidatePath("/pos/employees");
  return {};
}

export async function createPosEmployee(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  passwordConfirmation: string;
  locationId: string;
  role: "staff";
  active: boolean;
  capabilities: readonly string[];
}): Promise<PosActionResult> {
  const context = await requirePosAccess();
  if (
    !context.locations.some((location) => location.id === input.locationId) ||
    !context.capabilities.includes("staff.manage")
  )
    return { error: "Staff management permission required." };
  if (!input.email.includes("@"))
    return { error: "Enter a valid email address." };
  if (!input.name.trim()) return { error: "Enter the employee name." };
  if (input.password.length < 6)
    return {
      error: "The initial password must contain at least 6 characters.",
    };
  if (input.password !== input.passwordConfirmation)
    return { error: "The passwords do not match." };
  if (
    input.capabilities.some(
      (capability) => !context.capabilities.includes(capability),
    )
  )
    return { error: "You cannot grant access that you do not hold." };
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.name.trim(),
        phone: input.phone?.trim() || null,
      },
    });
    if (error || !data.user) return { error: employeeAuthError(error) };
    const supabase = await createSupabaseServerClient();
    const { error: accessError } = await supabase.rpc("pos_set_staff_access", {
      p_user_id: data.user.id,
      p_location_id: input.locationId,
      p_role: input.role,
      p_active: input.active,
      p_capabilities: input.capabilities,
    });
    if (accessError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return { error: accessError.message };
    }
    const { error: profileError } = await supabase.rpc(
      "pos_set_staff_profile",
      {
        p_user_id: data.user.id,
        p_location_id: input.locationId,
        p_full_name: input.name.trim(),
        p_phone: input.phone?.trim() || null,
      },
    );
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return { error: profileError.message };
    }
    revalidatePath("/pos/employees");
    return {};
  } catch (error) {
    return { error: employeeAuthError(error) };
  }
}
