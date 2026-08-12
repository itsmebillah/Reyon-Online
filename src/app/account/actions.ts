"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type CancellationState = { success?: string; error?: string };
export type SalesDocumentState = {
  error?: string;
  document?: {
    orderNumber: string;
    invoiceNumber: number;
    issuedAt: string;
    productSales: number;
    deliveryCharge: number;
    grandTotal: number;
    lines: {
      lineNumber: number;
      description: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }[];
    receipts: {
      receiptNumber: number;
      method: string;
      amount: number;
      issuedAt: string;
    }[];
  };
};

export async function findSalesDocuments(
  _state: SalesDocumentState,
  form: FormData,
): Promise<SalesDocumentState> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("customer_sales_documents", {
    p_order_reference: String(form.get("orderReference") ?? ""),
    p_phone: String(form.get("phone") ?? ""),
  });
  if (error || !data)
    return { error: "No completed-sale invoice matched those details." };
  return { document: data as SalesDocumentState["document"] };
}
export async function requestCancellation(
  _state: CancellationState,
  form: FormData,
): Promise<CancellationState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("request_order_cancellation", {
    p_order_reference: String(form.get("orderReference") ?? ""),
    p_phone: String(form.get("phone") ?? ""),
    p_reason: String(form.get("reason") ?? ""),
  });
  return error
    ? { error: error.message }
    : { success: "Cancellation request received for administrator review." };
}
export async function resubmitPayment(
  _state: CancellationState,
  form: FormData,
): Promise<CancellationState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("resubmit_manual_payment_evidence", {
    p_order_reference: String(form.get("orderReference") ?? ""),
    p_phone: String(form.get("phone") ?? ""),
    p_reference: String(form.get("transactionReference") ?? ""),
  });
  return error
    ? { error: error.message }
    : { success: "Corrected payment evidence submitted for review." };
}
export async function requestOrderChange(
  _state: CancellationState,
  form: FormData,
): Promise<CancellationState> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("request_order_change", {
    p_order_reference: String(form.get("orderReference") ?? ""),
    p_phone: String(form.get("phone") ?? ""),
    p_request: String(form.get("request") ?? ""),
  });
  return error
    ? { error: error.message }
    : {
        success:
          data === "return-refund"
            ? "Request recorded for the Return/Refund workflow."
            : "Correction request recorded for administrator review.",
      };
}
