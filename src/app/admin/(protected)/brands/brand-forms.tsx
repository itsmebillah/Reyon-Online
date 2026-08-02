"use client";
import Image from "next/image";
import { useActionState } from "react";
import type { ManagedBrand } from "@/features/catalog/data/brand-management";
import { createBrand, updateBrand, type BrandActionState } from "./actions";

const initial: BrandActionState = {};
function Result({ state }: { state: BrandActionState }) {
  return state.error ? (
    <p className="admin-form-error" role="alert">
      {state.error}
    </p>
  ) : state.success ? (
    <p className="admin-form-success" role="status">
      {state.success}
    </p>
  ) : null;
}
function Fields({ brand }: { brand?: ManagedBrand }) {
  return (
    <>
      <label>
        Brand name
        <input name="name" required defaultValue={brand?.name} />
      </label>
      <label>
        Brand description <span>(optional)</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={brand?.description ?? ""}
        />
      </label>
      <label>
        Official website <span>(optional)</span>
        <input
          name="websiteUrl"
          type="url"
          placeholder="https://"
          defaultValue={brand?.websiteUrl ?? ""}
        />
      </label>
      <div className="form-grid">
        <label>
          Country of origin <span>(optional two-letter country code)</span>
          <input
            name="countryCode"
            maxLength={2}
            pattern="[A-Za-z]{2}"
            placeholder="KR"
            defaultValue={brand?.countryCode ?? ""}
          />
        </label>
        <label>
          Display order
          <input
            name="displayOrder"
            type="number"
            min="0"
            step="1"
            defaultValue={brand?.displayOrder ?? 0}
          />
        </label>
      </div>
      <label>
        Brand logo <span>(JPG, PNG or WebP; maximum 2 MB)</span>
        <input
          name="logo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
      </label>
      <label className="publish-choice">
        <input
          name="isVisible"
          type="checkbox"
          defaultChecked={brand?.isVisible ?? true}
        />
        <span>
          <strong>Visible in the store</strong>
          <small>
            Hidden brands remain available for internal catalog records.
          </small>
        </span>
      </label>
      <label className="publish-choice">
        <input
          name="isFeatured"
          type="checkbox"
          defaultChecked={brand?.isFeatured ?? false}
        />
        <span>
          <strong>Featured brand</strong>
          <small>
            Prioritize this brand in future merchandising placements.
          </small>
        </span>
      </label>
    </>
  );
}
export function CreateBrandForm() {
  const [state, action, pending] = useActionState(createBrand, initial);
  return (
    <form action={action} className="catalog-admin-form">
      <Fields />
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Creating brand…" : "Create brand"}
      </button>
    </form>
  );
}
export function EditBrandForm({ brand }: { brand: ManagedBrand }) {
  const [state, action, pending] = useActionState(updateBrand, initial);
  return (
    <form action={action} className="catalog-admin-form">
      <input type="hidden" name="brandId" value={brand.id} />
      {brand.logoUrl && (
        <div className="brand-logo-preview">
          <Image
            src={brand.logoUrl}
            alt={`${brand.name} logo`}
            width={120}
            height={80}
            unoptimized
          />
        </div>
      )}
      <Fields brand={brand} />
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Saving changes…" : "Save brand"}
      </button>
    </form>
  );
}
