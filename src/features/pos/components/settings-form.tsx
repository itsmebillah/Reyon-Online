"use client";
import { useState } from "react";
import { savePosSettings } from "@/features/pos/actions";
export function SettingsForm({
  locationId,
  initial,
}: {
  locationId: string;
  initial: Record<string, string | number | null>;
}) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const field = (key: string, value: string | number) =>
    setValues((current) => ({ ...current, [key]: value }));
  return (
    <section className="pos-panel">
      <div className="pos-fields">
        <div className="pos-field">
          <label>Business / receipt name</label>
          <input
            value={String(values.businessName ?? "REYON")}
            onChange={(e) => field("businessName", e.target.value)}
          />
        </div>
        <div className="pos-field">
          <label>Phone</label>
          <input
            value={String(values.phone ?? "")}
            onChange={(e) => field("phone", e.target.value)}
          />
        </div>
        <div className="pos-field pos-field--wide">
          <label>Address</label>
          <input
            value={String(values.address ?? "")}
            onChange={(e) => field("address", e.target.value)}
          />
        </div>
        <div className="pos-field">
          <label>Currency symbol</label>
          <input
            value={String(values.currencySymbol ?? "৳")}
            onChange={(e) => field("currencySymbol", e.target.value)}
          />
        </div>
        <div className="pos-field">
          <label>Default tax rate (%)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={Number(values.taxRate ?? 0)}
            onChange={(e) => field("taxRate", Number(e.target.value))}
          />
        </div>
        <div className="pos-field">
          <label>Receipt format</label>
          <select
            value={String(values.receiptSize ?? "80mm")}
            onChange={(e) => field("receiptSize", e.target.value)}
          >
            <option value="58mm">58mm thermal</option>
            <option value="80mm">80mm thermal</option>
            <option value="a4">A4 invoice</option>
          </select>
        </div>
        <div className="pos-field">
          <label>Logo URL</label>
          <input
            value={String(values.logoUrl ?? "")}
            onChange={(e) => field("logoUrl", e.target.value)}
          />
        </div>
        <div className="pos-field pos-field--wide">
          <label>Receipt footer</label>
          <textarea
            value={String(values.footer ?? "")}
            onChange={(e) => field("footer", e.target.value)}
          />
        </div>
        <div className="pos-field pos-field--wide">
          <label>Return policy</label>
          <textarea
            value={String(values.returnPolicy ?? "")}
            onChange={(e) => field("returnPolicy", e.target.value)}
          />
        </div>
      </div>
      {status && (
        <p
          className={`pos-form-message ${status === "Settings saved." ? "success" : ""}`}
        >
          {status}
        </p>
      )}
      <button
        className="pos-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const settings = Object.fromEntries(
            Object.entries(values).filter(
              (entry): entry is [string, string | number] => entry[1] !== null,
            ),
          );
          const result = await savePosSettings({ locationId, settings });
          setBusy(false);
          setStatus(result.error ?? "Settings saved.");
        }}
      >
        {busy ? "Saving…" : "Save POS settings"}
      </button>
    </section>
  );
}
