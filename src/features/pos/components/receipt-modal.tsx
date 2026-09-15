"use client";

import { Printer, X } from "lucide-react";
import type { PosReceipt } from "@/features/pos/types";

const money = (value: number, symbol = "৳") =>
  `${symbol}${Number(value).toLocaleString("en-BD", { minimumFractionDigits: 2 })}`;

export function ReceiptModal({
  receipt,
  onClose,
}: {
  receipt: PosReceipt | null;
  onClose: () => void;
}) {
  if (!receipt) return null;
  const symbol = receipt.settings?.currency_symbol ?? "৳";
  return (
    <div className="pos-modal-backdrop">
      <section className="pos-receipt-dialog" role="dialog" aria-modal="true">
        <header className="pos-modal-header">
          <div>
            <strong>Sale complete</strong>
            <small>{receipt.orderNumber}</small>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        <article
          className={`pos-receipt pos-receipt--${receipt.settings?.receipt_size ?? "80mm"}`}
        >
          <div className="pos-receipt__business">
            <h2>{receipt.settings?.business_name ?? "REYON"}</h2>
            {receipt.settings?.address && <p>{receipt.settings.address}</p>}
            {receipt.settings?.phone && <p>{receipt.settings.phone}</p>}
          </div>
          <dl>
            <div>
              <dt>Invoice</dt>
              <dd>#{receipt.invoiceNumber}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{new Date(receipt.occurredAt).toLocaleString("en-BD")}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>
                {receipt.location} / {receipt.register}
              </dd>
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
                <th>Amount</th>
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
                  <td>{money(item.total, symbol)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pos-receipt__totals">
            <span>
              Subtotal <b>{money(receipt.gross, symbol)}</b>
            </span>
            <span>
              Discount <b>-{money(receipt.discount, symbol)}</b>
            </span>
            <span>
              Tax ({receipt.taxRate}%) <b>{money(receipt.tax, symbol)}</b>
            </span>
            <span className="grand">
              Total <b>{money(receipt.total, symbol)}</b>
            </span>
            <span>
              Paid <b>{money(receipt.paid, symbol)}</b>
            </span>
            {receipt.change > 0 && (
              <span>
                Change <b>{money(receipt.change, symbol)}</b>
              </span>
            )}
            {receipt.due > 0 && (
              <span className="due">
                Due <b>{money(receipt.due, symbol)}</b>
              </span>
            )}
          </div>
          {receipt.notes && (
            <p className="pos-receipt__note">Note: {receipt.notes}</p>
          )}
          <p className="pos-receipt__footer">
            {receipt.settings?.footer ?? "Thank you for shopping with REYON."}
          </p>
          {receipt.settings?.return_policy && (
            <p className="pos-receipt__policy">
              {receipt.settings.return_policy}
            </p>
          )}
        </article>
        <footer className="pos-modal-actions">
          <button className="pos-button pos-button--ghost" onClick={onClose}>
            New sale
          </button>
          <button className="pos-button" onClick={() => window.print()}>
            <Printer /> Print receipt / invoice
          </button>
        </footer>
      </section>
    </div>
  );
}
