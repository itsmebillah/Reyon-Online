"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export type CancellationState = { success?: string; error?: string };
export type SalesDocumentState = {
  error?: string;
  document?: {
    orderNumber: string;
    invoiceNumber: number;
    issuedAt: string;
    grossProductAmount: number;
    discountAmount: number;
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
export type DeliveryStatusState = {
  error?: string;
  delivery?: {
    orderNumber: string;
    status: string;
    shipmentReference: string | null;
    updatedAt: string | null;
  };
};
export type ReturnEligibilityState = {
  error?: string;
  order?: {
    orderNumber: string;
    orderState: string;
    eligibleUntil: string;
    lines: {
      lineId: string;
      lineNumber: number;
      productName: string;
      variantLabel: string | null;
      orderedQuantity: number;
      remainingQuantity: number;
      normallyReturnable: boolean;
    }[];
  };
};

export async function findReturnEligibility(
  _state: ReturnEligibilityState,
  form: FormData,
): Promise<ReturnEligibilityState> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("customer_return_eligible_lines", {
    p_order_reference: String(form.get("orderReference") ?? ""),
    p_phone: String(form.get("phone") ?? ""),
  });
  if (error || !data)
    return { error: "No return-eligible order matched those details." };
  return { order: data as ReturnEligibilityState["order"] };
}

export async function submitReturnRequest(
  _state: CancellationState,
  form: FormData,
): Promise<CancellationState> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("customer_request_return", {
    p_order_reference: String(form.get("orderReference") ?? ""),
    p_phone: String(form.get("phone") ?? ""),
    p_order_line_id: String(form.get("orderLineId") ?? ""),
    p_quantity: Number(form.get("quantity")),
    p_reason: String(form.get("reason") ?? ""),
    p_condition: String(form.get("condition") ?? ""),
    p_note: String(form.get("note") ?? ""),
    p_photo_reference: String(form.get("photoReference") ?? "").trim() || null,
    p_video_reference: String(form.get("videoReference") ?? "").trim() || null,
  });
  return error
    ? { error: error.message }
    : { success: "Return request submitted for REYON review." };
}

export async function findDeliveryStatus(
  _state: DeliveryStatusState,
  form: FormData,
): Promise<DeliveryStatusState> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("customer_delivery_status", {
    p_order_reference: String(form.get("orderReference") ?? ""),
    p_phone: String(form.get("phone") ?? ""),
  });
  if (error || !data)
    return { error: "No delivery matched those order details." };
  return { delivery: data as DeliveryStatusState["delivery"] };
}

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
