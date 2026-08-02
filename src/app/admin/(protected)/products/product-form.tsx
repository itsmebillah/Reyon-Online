"use client";
import { useActionState } from "react";
import type { ProductOptions } from "@/features/catalog/data/product-management";
import { createProduct, type ProductActionState } from "./actions";
const initial: ProductActionState = {};
export function ProductForm({
  brands,
  categories,
}: {
  brands: ProductOptions["brands"];
  categories: ProductOptions["categories"];
}) {
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
        <div className="form-grid">
          <label>
            Secure image URL
            <input name="imageUrl" type="url" required placeholder="https://" />
          </label>
          <label>
            Image description <span>(optional)</span>
            <input name="imageAlt" />
          </label>
        </div>
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
