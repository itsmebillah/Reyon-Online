"use client";

import { useMemo, useState } from "react";
import { CreditCard, Plus, Trash2, X } from "lucide-react";
import {
  calculatePaymentSummary,
  generateQuickCashPresets,
} from "@/features/pos/domain/quick-cash";
import type { PosTenderInput } from "@/features/pos/types";

export type CheckoutValue = Readonly<{
  customerName: string;
  customerPhone: string;
  notes: string;
  discountType: "FIXED" | "PERCENT";
  discountValue: number;
  taxRate: number;
  tenders: readonly PosTenderInput[];
}>;

type DraftTender = {
  method: PosTenderInput["method"];
  amount: string;
  reference: string;
};

export function CheckoutModal({
  subtotal,
  defaultTaxRate,
  canRecordDue,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  subtotal: number;
  defaultTaxRate: number;
  canRecordDue: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (value: CheckoutValue) => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENT">(
    "FIXED",
  );
  const [discountValue, setDiscountValue] = useState("0");
  const [taxRate, setTaxRate] = useState(String(defaultTaxRate));
  const [split, setSplit] = useState(false);
  const [tenders, setTenders] = useState<DraftTender[]>([
    { method: "cash", amount: "", reference: "" },
  ]);
  const totals = useMemo(() => {
    const value = Math.max(0, Number(discountValue) || 0);
    const discount =
      discountType === "PERCENT"
        ? (subtotal * Math.min(value, 100)) / 100
        : Math.min(value, subtotal);
    const tax =
      ((subtotal - discount) * Math.max(0, Number(taxRate) || 0)) / 100;
    const total = Math.round((subtotal - discount + tax) * 100) / 100;
    const tendered = tenders.reduce(
      (sum, tender) => sum + Math.max(0, Number(tender.amount) || 0),
      0,
    );
    return {
      discount,
      tax,
      total,
      tendered,
      ...calculatePaymentSummary(total, tendered),
    };
  }, [discountType, discountValue, subtotal, taxRate, tenders]);
  const quickCash = generateQuickCashPresets(totals.total);
  const updateTender = (index: number, patch: Partial<DraftTender>) =>
    setTenders((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  const submit = () => {
    const clean = tenders
      .filter((tender) => Number(tender.amount) > 0)
      .map((tender) => ({
        method: tender.method,
        amount: Number(tender.amount),
        reference: tender.reference || undefined,
      }));
    if (!clean.length && !canRecordDue) return;
    onSubmit({
      customerName,
      customerPhone,
      notes,
      discountType,
      discountValue: Number(discountValue) || 0,
      taxRate: Number(taxRate) || 0,
      tenders: clean,
    });
  };
  return (
    <div className="pos-modal-backdrop">
      <section
        className="pos-checkout"
        role="dialog"
        aria-modal="true"
        aria-label="Checkout"
      >
        <header className="pos-modal-header">
          <div>
            <strong>Complete Sale</strong>
            <small>Customer, discount and payment</small>
          </div>
          <button onClick={onClose} disabled={busy}>
            <X />
          </button>
        </header>
        <div className="pos-checkout__body">
          <section className="pos-section">
            <h3>Customer</h3>
            <div className="pos-fields">
              <div className="pos-field">
                <label htmlFor="customer-name">Name (optional)</label>
                <input
                  id="customer-name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Walk-in Customer"
                />
              </div>
              <div className="pos-field">
                <label htmlFor="customer-phone">Phone</label>
                <input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>
          </section>
          <section className="pos-section">
            <h3>Discount & tax</h3>
            <div className="pos-fields">
              <div className="pos-field">
                <label>Discount type</label>
                <select
                  value={discountType}
                  onChange={(event) =>
                    setDiscountType(event.target.value as "FIXED" | "PERCENT")
                  }
                >
                  <option value="FIXED">Fixed amount</option>
                  <option value="PERCENT">Percentage</option>
                </select>
              </div>
              <div className="pos-field">
                <label>Discount</label>
                <input
                  value={discountValue}
                  onChange={(event) => setDiscountValue(event.target.value)}
                  type="number"
                  min="0"
                />
              </div>
              <div className="pos-field">
                <label>Tax rate (%)</label>
                <input
                  value={taxRate}
                  onChange={(event) => setTaxRate(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </section>
          <section className="pos-section">
            <h3>
              <CreditCard size={15} /> Payment
            </h3>
            <label className="pos-badge">
              <input
                type="checkbox"
                checked={split}
                onChange={(event) => {
                  setSplit(event.target.checked);
                  if (event.target.checked && tenders.length === 1)
                    setTenders([
                      {
                        method: "cash",
                        amount: String(Math.round(totals.total / 2)),
                        reference: "",
                      },
                      {
                        method: "card",
                        amount: String(
                          totals.total - Math.round(totals.total / 2),
                        ),
                        reference: "",
                      },
                    ]);
                }}
              />{" "}
              Split / multiple tender
            </label>
            {tenders.map((tender, index) => (
              <div className="pos-tender-line" key={index}>
                <select
                  value={tender.method}
                  onChange={(event) =>
                    updateTender(index, {
                      method: event.target.value as DraftTender["method"],
                    })
                  }
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile payment</option>
                  <option value="bank-transfer">Bank transfer</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tender.amount}
                  placeholder="Amount"
                  onChange={(event) =>
                    updateTender(index, { amount: event.target.value })
                  }
                />
                <input
                  value={tender.reference}
                  onChange={(event) =>
                    updateTender(index, { reference: event.target.value })
                  }
                  placeholder={
                    tender.method === "cash"
                      ? "Reference (optional)"
                      : "Transaction reference"
                  }
                />
                {split && tenders.length > 1 && (
                  <button
                    onClick={() =>
                      setTenders((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                    aria-label="Remove tender"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {split && (
              <button
                className="pos-button pos-button--ghost"
                onClick={() =>
                  setTenders((current) => [
                    ...current,
                    {
                      method: "mobile",
                      amount: String(Math.max(0, totals.due)),
                      reference: "",
                    },
                  ])
                }
              >
                <Plus size={15} /> Add tender
              </button>
            )}
            {!split && tenders[0]?.method === "cash" && (
              <div className="pos-quick-cash">
                {quickCash.map((amount, index) => (
                  <button
                    key={amount}
                    onClick={() => updateTender(0, { amount: String(amount) })}
                  >
                    {index === 0 ? "Exact " : ""}৳{amount.toLocaleString()}
                  </button>
                ))}
              </div>
            )}
          </section>
          <section className="pos-section">
            <div className="pos-field">
              <label>Sale notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional internal or receipt note"
              />
            </div>
          </section>
          <div className="pos-checkout-total">
            <span>
              Subtotal <b>৳{subtotal.toLocaleString()}</b>
            </span>
            <span>
              Discount <b>-৳{totals.discount.toLocaleString()}</b>
            </span>
            <span>
              Tax <b>৳{totals.tax.toLocaleString()}</b>
            </span>
            <span className="grand">
              Payable <b>৳{totals.total.toLocaleString()}</b>
            </span>
            {totals.change > 0 && (
              <span>
                Change <b>৳{totals.change.toLocaleString()}</b>
              </span>
            )}
            {totals.due > 0 && (
              <span className="due">
                Due <b>৳{totals.due.toLocaleString()}</b>
              </span>
            )}
          </div>
          {error && (
            <p className="pos-form-message" role="alert">
              {error}
            </p>
          )}
        </div>
        <footer className="pos-modal-actions">
          <button
            className="pos-button pos-button--ghost"
            onClick={onClose}
            disabled={busy}
          >
            Back
          </button>
          <button
            className="pos-button"
            disabled={busy || (!canRecordDue && totals.due > 0)}
            onClick={submit}
          >
            {busy
              ? "Completing…"
              : `Complete sale · ৳${totals.total.toLocaleString()}`}
          </button>
        </footer>
      </section>
    </div>
  );
}
