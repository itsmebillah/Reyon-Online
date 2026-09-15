"use client";
import { useState } from "react";
import { adjustPosInventory } from "@/features/pos/actions";
import type { PosProduct } from "@/features/pos/types";
export function InventoryAdjustment({
  locationId,
  products,
}: {
  locationId: string;
  products: readonly PosProduct[];
}) {
  const [variantId, setVariantId] = useState(products[0]?.id ?? "");
  const [type, setType] = useState("adjustment-in");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="pos-panel">
      <h2>Stock entry / adjustment</h2>
      <p>
        Every change posts to Reyon’s immutable inventory ledger and updates
        website availability.
      </p>
      <div className="pos-fields">
        <div className="pos-field pos-field--wide">
          <label>Product variant</label>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            {products.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name} — {p.variantLabel} ({p.sku})
              </option>
            ))}
          </select>
        </div>
        <div className="pos-field">
          <label>Movement</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="opening-stock">Opening stock</option>
            <option value="purchase-receive">
              Stock entry / purchase receive
            </option>
            <option value="adjustment-in">Adjustment in</option>
            <option value="adjustment-out">Adjustment out</option>
            <option value="damage-loss">Damage / loss</option>
          </select>
        </div>
        <div className="pos-field">
          <label>Quantity</label>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="pos-field pos-field--wide">
          <label>Reason</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required operational reason"
          />
        </div>
      </div>
      {status && (
        <p
          className={`pos-form-message ${status.startsWith("Saved") ? "success" : ""}`}
        >
          {status}
        </p>
      )}
      <button
        className="pos-button"
        disabled={busy || !reason || !variantId}
        onClick={async () => {
          setBusy(true);
          const result = await adjustPosInventory({
            variantId,
            locationId,
            movementType: type,
            quantity: Number(quantity),
            reason,
          });
          setBusy(false);
          setStatus(result.error ?? "Saved. Shared stock is updated.");
        }}
      >
        {busy ? "Saving…" : "Record inventory movement"}
      </button>
    </section>
  );
}
