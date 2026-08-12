"use client";
import { useActionState } from "react";
import { findSalesDocuments } from "./actions";

const money = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 2,
  }).format(amount);

export function SalesDocumentForm() {
  const [state, action, pending] = useActionState(findSalesDocuments, {});
  return (
    <>
      <form action={action} className="admin-form">
        <label>
          <span>Order reference</span>
          <input name="orderReference" required placeholder="RYN-2026-000001" />
        </label>
        <label>
          <span>Checkout phone</span>
          <input name="phone" type="tel" required autoComplete="tel" />
        </label>
        <button className="button button--primary" disabled={pending}>
          {pending ? "Finding documents…" : "View invoice & receipts"}
        </button>
        {state.error && <p className="form-error">{state.error}</p>}
      </form>
      {state.document && (
        <article className="admin-module-card" aria-live="polite">
          <span>Invoice #{state.document.invoiceNumber}</span>
          <h3>{state.document.orderNumber}</h3>
          <div className="inventory-table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {state.document.lines.map((line) => (
                  <tr key={line.lineNumber}>
                    <td>{line.description}</td>
                    <td>{line.quantity}</td>
                    <td>{money(Number(line.unitPrice))}</td>
                    <td>{money(Number(line.lineTotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Product sales: {money(Number(state.document.productSales))}</p>
          <p>Delivery charge: {money(Number(state.document.deliveryCharge))}</p>
          <p>
            <strong>
              Grand total: {money(Number(state.document.grandTotal))}
            </strong>
          </p>
          <h3>Payment receipts</h3>
          {state.document.receipts.length ? (
            state.document.receipts.map((receipt) => (
              <p key={receipt.receiptNumber}>
                Receipt #{receipt.receiptNumber} · {receipt.method} ·{" "}
                {money(Number(receipt.amount))}
              </p>
            ))
          ) : (
            <p>No payment receipt has been issued.</p>
          )}
        </article>
      )}
    </>
  );
}
