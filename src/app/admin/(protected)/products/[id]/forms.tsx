"use client";
import { useActionState } from "react";
import {
  watchFields,
  type WatchSpecifications,
} from "@/features/catalog/domain/watch";
import { saveDetails, saveVariant, type EditState } from "./actions";
export type WatchEdit = {
  specifications: WatchSpecifications;
  description: string;
  variants: {
    id: string;
    label: string;
    sku: string;
    price: number;
    compareAtPrice: number | null;
  }[];
};
export function DetailsForm({
  id,
  data,
}: {
  id: string;
  data: WatchEdit | null;
}) {
  const [s, a, p] = useActionState<EditState, FormData>(saveDetails, {});
  return (
    <form action={a} className="catalog-admin-form">
      <input type="hidden" name="productId" value={id} />
      <div className="form-grid">
        {Object.entries(watchFields).map(([key, label]) => (
          <label key={key}>
            {label}
            {key === "gender" ? (
              <select
                name={key}
                defaultValue={data?.specifications.gender ?? "unisex"}
              >
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="unisex">Unisex</option>
              </select>
            ) : (
              <input
                name={key}
                required={key === "model"}
                defaultValue={
                  data?.specifications[key as keyof WatchSpecifications]
                }
                maxLength={1000}
              />
            )}
          </label>
        ))}
      </div>
      <label>
        Description
        <textarea
          name="description"
          rows={4}
          maxLength={10000}
          defaultValue={data?.description}
        />
      </label>
      <button className="button button--primary" disabled={p}>
        Save specifications
      </button>
      <p role="status">{s.error ?? s.success}</p>
    </form>
  );
}
export function VariantForm({
  id,
  variant,
}: {
  id: string;
  variant?: WatchEdit["variants"][number];
}) {
  const [s, a, p] = useActionState<EditState, FormData>(saveVariant, {});
  return (
    <form action={a} className="catalog-admin-form">
      <input type="hidden" name="productId" value={id} />
      <input type="hidden" name="variantId" value={variant?.id ?? ""} />
      <div className="form-grid">
        <label>
          Variant label
          <input
            name="label"
            required
            defaultValue={variant?.label}
            placeholder="Blue dial / steel bracelet"
          />
        </label>
        <label>
          SKU
          <input name="sku" required={!!variant} defaultValue={variant?.sku} />
        </label>
        <label>
          Current price ৳
          <input
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={variant?.price}
          />
        </label>
        <label>
          Compare-at price ৳ (optional)
          <input
            name="compareAt"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={variant?.compareAtPrice ?? undefined}
          />
        </label>
      </div>
      <button className="button button--secondary" disabled={p}>
        {variant ? "Save variant" : "Add variant"}
      </button>
      <p role="status">{s.error ?? s.success}</p>
    </form>
  );
}
