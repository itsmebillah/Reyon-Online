"use client";

import { useState } from "react";
import { importPosProducts } from "@/features/pos/actions";

type Option = Readonly<{ id: string; name: string }>;
type Asset = Readonly<{ id: string; url: string }>;

function parseCsv(source: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      record.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      record.push(field.trim());
      if (record.some(Boolean)) records.push(record);
      record = [];
      field = "";
    } else field += character;
  }
  record.push(field.trim());
  if (record.some(Boolean)) records.push(record);
  if (quoted) throw new Error("CSV contains an unclosed quote.");
  if (records.length < 2)
    throw new Error("CSV must include a header and product rows.");
  const headers = records[0]!.map((value) => value.toLowerCase());
  return records
    .slice(1)
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""]),
      ),
    );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ProductCsvImport({
  locationId,
  brands,
  categories,
  assets,
}: {
  locationId: string;
  brands: readonly Option[];
  categories: readonly Option[];
  assets: readonly Asset[];
}) {
  const [open, setOpen] = useState(false);
  const [brandId, setBrandId] = useState(brands[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [publish, setPublish] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  return (
    <>
      <button
        className="pos-button pos-button--ghost"
        onClick={() => setOpen(true)}
      >
        Import CSV
      </button>
      {open && (
        <div className="pos-modal-backdrop" role="presentation">
          <section
            className="pos-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-title"
          >
            <header>
              <div>
                <h2 id="csv-title">Import products</h2>
                <p>
                  Up to 100 rows are validated and committed as one canonical
                  transaction.
                </p>
              </div>
              <button aria-label="Close import" onClick={() => setOpen(false)}>
                ×
              </button>
            </header>
            <div className="pos-modal__body">
              <p>
                <strong>Required CSV headers:</strong> name, sku,
                purchase_price, selling_price. Optional: slug, variant_label,
                barcode, compare_at_price, discount_price, product_code, model,
                gender, movement, description.
              </p>
              <div className="pos-form-grid">
                <label className="pos-field">
                  Brand
                  <select
                    value={brandId}
                    onChange={(event) => setBrandId(event.target.value)}
                  >
                    {brands.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pos-field">
                  Category
                  <select
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                  >
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pos-field">
                  Default image
                  <select
                    value={assetId}
                    onChange={(event) => setAssetId(event.target.value)}
                  >
                    {assets.map((item, index) => (
                      <option key={item.id} value={item.id}>
                        Media asset {index + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pos-field">
                  <span>Publication</span>
                  <span>
                    <input
                      type="checkbox"
                      checked={publish}
                      onChange={(event) => setPublish(event.target.checked)}
                    />{" "}
                    Publish after validation
                  </span>
                </label>
              </div>
              <label className="pos-field">
                CSV file
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {status && <p className="pos-form-message">{status}</p>}
            </div>
            <footer>
              <button
                className="pos-button pos-button--ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                className="pos-button"
                disabled={busy || !file || !brandId || !categoryId || !assetId}
                onClick={async () => {
                  if (!file) return;
                  setBusy(true);
                  try {
                    const parsed = parseCsv(await file.text());
                    const rows = parsed.map((row, index) => {
                      const name = row.name?.trim();
                      const sku = row.sku?.trim();
                      if (
                        !name ||
                        !sku ||
                        !row.purchase_price ||
                        !row.selling_price
                      )
                        throw new Error(
                          `Row ${index + 2} is missing a required value.`,
                        );
                      return {
                        p_name: name,
                        p_slug:
                          row.slug?.trim() || `${slug(name)}-${slug(sku)}`,
                        p_brand_id: brandId,
                        p_category_id: categoryId,
                        p_variant_label: row.variant_label?.trim() || "Default",
                        p_sku: sku,
                        p_barcode: row.barcode?.trim() || null,
                        p_purchase_price: row.purchase_price,
                        p_selling_price: row.selling_price,
                        p_compare_at_price: row.compare_at_price || null,
                        p_discount_price: row.discount_price || null,
                        p_asset_id: assetId,
                        p_image_alt: name,
                        p_country_code: "BD",
                        p_product_code: row.product_code?.trim() || null,
                        p_publish: publish,
                        specifications: {
                          model: row.model?.trim() || name,
                          gender: row.gender?.trim() || "unisex",
                          movement: row.movement?.trim() || "Unspecified",
                          display: "Analog",
                        },
                        description: row.description?.trim() || "",
                      };
                    });
                    const result = await importPosProducts({
                      locationId,
                      idempotencyKey: crypto.randomUUID(),
                      rows,
                    });
                    setStatus(
                      result.error ??
                        `${result.data?.imported ?? 0} products imported.`,
                    );
                  } catch (error) {
                    setStatus(
                      error instanceof Error
                        ? error.message
                        : "CSV import failed.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Importing…" : "Import products"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
