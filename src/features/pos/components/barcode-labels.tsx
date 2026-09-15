"use client";
import { useState } from "react";
import { Barcode, Printer, X } from "lucide-react";
import type { PosProduct } from "@/features/pos/types";
import { generateBarcodeSVG } from "@/features/pos/domain/barcode-engine";
export function BarcodeLabels({
  products,
}: {
  products: readonly PosProduct[];
}) {
  const [selected, setSelected] = useState<PosProduct | null>(null);
  return (
    <>
      {
        <button
          className="pos-button pos-button--ghost"
          onClick={() => setSelected(products[0] ?? null)}
        >
          <Barcode size={17} /> Barcode labels
        </button>
      }
      {selected && (
        <div className="pos-modal-backdrop">
          <section className="pos-receipt-dialog">
            <header className="pos-modal-header">
              <div>
                <strong>Barcode label printing</strong>
                <small>Canonical Reyon SKU/barcode</small>
              </div>
              <button onClick={() => setSelected(null)}>
                <X />
              </button>
            </header>
            <div className="pos-checkout__body">
              <div className="pos-field">
                <label>Product</label>
                <select
                  value={selected.id}
                  onChange={(e) =>
                    setSelected(
                      products.find((p) => p.id === e.target.value) ?? selected,
                    )
                  }
                >
                  {products.map((p) => (
                    <option value={p.id} key={p.id}>
                      {p.name} — {p.sku}
                    </option>
                  ))}
                </select>
              </div>
              <article className="pos-panel" style={{ textAlign: "center" }}>
                <strong>{selected.name}</strong>
                <p>{selected.variantLabel}</p>
                <div
                  aria-label={`Barcode ${selected.barcode || selected.sku}`}
                  dangerouslySetInnerHTML={{
                    __html: generateBarcodeSVG(
                      selected.barcode || selected.sku,
                      {
                        height: 58,
                        barWidth: 2,
                        fontSize: 12,
                      },
                    ),
                  }}
                />
                <b>৳{Number(selected.price).toLocaleString()}</b>
              </article>
            </div>
            <footer className="pos-modal-actions">
              <button className="pos-button" onClick={() => window.print()}>
                <Printer size={17} /> Print labels
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
