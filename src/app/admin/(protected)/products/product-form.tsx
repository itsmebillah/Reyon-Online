"use client";
import { useActionState, useState } from "react";
import Image from "next/image";
import type { MediaLibraryAsset } from "@/features/catalog/data/product-media-management";
import type { ProductOptions } from "@/features/catalog/data/product-management";
import { createProduct, type ProductActionState } from "./actions";
const initial: ProductActionState = {};
export function ProductForm({
  brands,
  categories,
  mediaAssets,
}: {
  brands: ProductOptions["brands"];
  categories: ProductOptions["categories"];
  mediaAssets: readonly MediaLibraryAsset[];
}) {
  const [source, setSource] = useState<"upload" | "library">("upload"),
    [assetId, setAssetId] = useState(""),
    [uploadPreview, setUploadPreview] = useState("");
  const selected = mediaAssets.find((asset) => asset.id === assetId);
  const [state, action, pending] = useActionState(createProduct, initial),
    blocked = !brands.length || !categories.length;
  return (
    <form action={action} className="catalog-admin-form catalog-product-form">
      {blocked && (
        <p className="admin-form-error" role="alert">
          Create at least one brand and category before adding a product.
        </p>
      )}
      <fieldset>
        <legend>Product identity</legend>
        <div className="form-grid">
          <label>
            Product name
            <input name="name" required />
          </label>
          <label>
            Brand
            <select name="brandId" required defaultValue="">
              <option value="" disabled>
                Select brand
              </option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Primary category
            <select name="categoryId" required defaultValue="">
              <option value="" disabled>
                Select category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Country of origin <span>(optional two-letter code)</span>
            <input
              name="countryCode"
              maxLength={2}
              pattern="[A-Za-z]{2}"
              placeholder="KR"
            />
          </label>
          <label>
            Product code <span>(optional)</span>
            <input name="productCode" />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>First sellable variant</legend>
        <div className="form-grid">
          <label>
            Variant type
            <select name="variantType" defaultValue="size">
              <option value="size">Size</option>
              <option value="volume">Volume</option>
              <option value="color">Color</option>
              <option value="shade">Shade</option>
              <option value="weight">Weight</option>
              <option value="pack-size">Pack size</option>
            </select>
          </label>
          <label>
            Variant label
            <input name="variantLabel" required placeholder="30 ml" />
          </label>
          <label>
            SKU <span>(generated if empty)</span>
            <input name="sku" />
          </label>
          <label>
            Barcode <span>(optional)</span>
            <input name="barcode" />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Pricing in BDT</legend>
        <div className="form-grid">
          <label>
            Purchase price <span>(optional)</span>
            <input name="purchasePrice" type="number" min="0" step="0.01" />
          </label>
          <label>
            Selling price
            <input
              name="sellingPrice"
              type="number"
              min="0"
              step="0.01"
              required
            />
          </label>
          <label>
            Compare-at price / MRP <span>(optional)</span>
            <input name="compareAtPrice" type="number" min="0" step="0.01" />
          </label>
          <label>
            Discount price <span>(optional)</span>
            <input name="discountPrice" type="number" min="0" step="0.01" />
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Primary image</legend>
        <div className="media-source-actions">
          <button
            type="button"
            className={`button ${source === "upload" ? "button--primary" : "button--secondary"}`}
            onClick={() => setSource("upload")}
          >
            Upload image
          </button>
          <button
            type="button"
            className={`button ${source === "library" ? "button--primary" : "button--secondary"}`}
            onClick={() => setSource("library")}
          >
            Choose from Media Library
          </button>
        </div>
        <div className="form-grid">
          {source === "upload" ? (
            <>
              <label>
                Image{" "}
                <span>
                  JPG, PNG or WebP · 5 MB maximum · at least 800 × 800 px
                </span>
                <input
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      setUploadPreview("");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () =>
                      setUploadPreview(String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <label className="publish-choice">
                <input name="licensingConfirmed" type="checkbox" required />
                <span>
                  <strong>Licensing confirmed</strong>
                  <small>
                    I confirm REYON is authorized to use this image.
                  </small>
                </span>
              </label>
            </>
          ) : (
            <label>
              Media Library
              <select
                name="assetId"
                required
                value={assetId}
                onChange={(event) => setAssetId(event.target.value)}
              >
                <option value="" disabled>
                  Select an existing image
                </option>
                {mediaAssets.map((asset) => (
                  <option value={asset.id} key={asset.id}>
                    {asset.locator}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Image description
            <input name="imageAlt" required />
          </label>
        </div>
        {(selected || uploadPreview) && (
          <div className="media-selection-preview">
            <Image
              src={selected?.url ?? uploadPreview}
              alt="Selected product image preview"
              width={180}
              height={180}
              unoptimized
            />
          </div>
        )}
      </fieldset>
      <label className="publish-choice">
        <input name="publish" type="checkbox" defaultChecked />
        <span>
          <strong>Publish on the customer website now</strong>
          <small>Turn this off to save a Draft for later publication.</small>
        </span>
      </label>
      {state.error ? (
        <p className="admin-form-error" role="alert">
          {state.error}
        </p>
      ) : state.success ? (
        <p className="admin-form-success" role="status">
          {state.success}
        </p>
      ) : null}
      <button className="button button--primary" disabled={pending || blocked}>
        {pending ? "Creating product…" : "Create product"}
      </button>
    </form>
  );
}
