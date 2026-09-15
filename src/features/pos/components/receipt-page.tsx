"use client";
import Link from "next/link";
import { Printer } from "lucide-react";
import type { PosReceipt } from "@/features/pos/types";
export function ReceiptPage({ receipt }: { receipt: PosReceipt }) {
  const symbol = receipt.settings?.currency_symbol ?? "৳";
  const money = (value: number) =>
    `${symbol}${Number(value).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Receipt & invoice</h1>
          <p>
            {receipt.orderNumber} · Invoice #{receipt.invoiceNumber}
          </p>
        </div>
        <div className="pos-toolbar">
          <Link className="pos-button pos-button--ghost" href="/pos/sales">
            Back
          </Link>
          <button className="pos-button" onClick={() => window.print()}>
            <Printer size={17} /> Print
          </button>
        </div>
      </header>
      <section className="pos-panel">
        <article
          className={`pos-receipt pos-receipt--${receipt.settings?.receipt_size ?? "80mm"}`}
        >
          <div className="pos-receipt__business">
            <h2>{receipt.settings?.business_name ?? "REYON"}</h2>
            <p>{receipt.settings?.address}</p>
          </div>
          <dl>
            <div>
              <dt>Date</dt>
              <dd>{new Date(receipt.occurredAt).toLocaleString("en-BD")}</dd>
            </div>
            <div>
              <dt>Cashier</dt>
              <dd>{receipt.cashier}</dd>
            </div>
            <div>
              <dt>Customer</dt>
              <dd>{receipt.customerName || "Walk-in Customer"}</dd>
            </div>
          </dl>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item) => (
                <tr key={`${item.sku}-${item.name}`}>
                  <td>
                    {item.name}
                    <small>
                      {item.variant} · {item.sku}
                    </small>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{money(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pos-receipt__totals">
            <span>
              Discount <b>-{money(receipt.discount)}</b>
            </span>
            <span>
              Tax <b>{money(receipt.tax)}</b>
            </span>
            <span className="grand">
              Total <b>{money(receipt.total)}</b>
            </span>
            <span>
              Paid <b>{money(receipt.paid)}</b>
            </span>
            {receipt.change > 0 && (
              <span>
                Change <b>{money(receipt.change)}</b>
              </span>
            )}
            {receipt.due > 0 && (
              <span className="due">
                Due <b>{money(receipt.due)}</b>
              </span>
            )}
          </div>
          <p className="pos-receipt__footer">{receipt.settings?.footer}</p>
          <p className="pos-receipt__policy">
            {receipt.settings?.return_policy}
          </p>
        </article>
      </section>
    </div>
  );
}
