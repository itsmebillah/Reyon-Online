"use client";

import Image from "next/image";
import { useActionState } from "react";
import type { ManagedProductImage } from "@/features/catalog/data/product-media-management";
import {
  addProductImage,
  replaceProductImage,
  updateProductImage,
  type MediaActionState,
} from "./actions";

const initial: MediaActionState = {};
function Result({ state }: { state: MediaActionState }) {
  if (state.error)
    return (
      <p className="admin-form-error" role="alert">
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p className="admin-form-success" role="status">
        {state.success}
      </p>
    );
  return null;
}

const fileField = (
  <label>
    Image <span>JPG, PNG or WebP · 5 MB maximum · at least 800 × 800 px</span>
    <input
      name="image"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      required
    />
  </label>
);
const licenseField = (
  <label className="publish-choice">
    <input name="licensingConfirmed" type="checkbox" required />
    <span>
      <strong>Licensing confirmed</strong>
      <small>I confirm REYON is authorized to use this image.</small>
    </span>
  </label>
);

export function AddProductImageForm({
  productId,
  slug,
  defaultAlt,
  disabled,
}: {
  productId: string;
  slug: string;
  defaultAlt: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(addProductImage, initial);
  return (
    <form action={action} className="catalog-admin-form media-upload-form">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="defaultAlt" value={defaultAlt} />
      {fileField}
      <label>
        ALT text <span>Required; edit the suggested draft when needed</span>
        <input name="altText" required defaultValue={defaultAlt} />
      </label>
      {licenseField}
      <Result state={state} />
      <button className="button button--primary" disabled={pending || disabled}>
        {disabled
          ? "Gallery limit reached"
          : pending
            ? "Uploading…"
            : "Add image"}
      </button>
    </form>
  );
}

export function ProductImageEditor({
  image,
  productId,
  slug,
}: {
  image: ManagedProductImage;
  productId: string;
  slug: string;
}) {
  const [updateState, updateAction, updating] = useActionState(
    updateProductImage,
    initial,
  );
  const [replaceState, replaceAction, replacing] = useActionState(
    replaceProductImage,
    initial,
  );
  return (
    <article className="media-editor">
      <div className="media-editor__preview">
        <Image
          src={image.url}
          alt={image.altText}
          width={240}
          height={240}
          unoptimized
        />
        <span>
          {image.isPrimary ? "Primary" : `Position ${image.displayOrder + 1}`}
        </span>
      </div>
      <form action={updateAction} className="catalog-admin-form">
        <input type="hidden" name="mediaId" value={image.id} />
        <input type="hidden" name="slug" value={slug} />
        <label>
          ALT text
          <input name="altText" required defaultValue={image.altText} />
        </label>
        <label>
          Display order
          <input
            name="displayOrder"
            type="number"
            min="0"
            max="11"
            defaultValue={image.displayOrder}
          />
        </label>
        <label className="publish-choice">
          <input
            name="isPrimary"
            type="checkbox"
            defaultChecked={image.isPrimary}
          />
          <span>
            <strong>Primary image</strong>
            <small>The primary image is always placed first.</small>
          </span>
        </label>
        <Result state={updateState} />
        <button className="button button--secondary" disabled={updating}>
          {updating ? "Saving…" : "Save details"}
        </button>
      </form>
      <details className="media-replace">
        <summary>Replace image file</summary>
        <form action={replaceAction} className="catalog-admin-form">
          <input type="hidden" name="mediaId" value={image.id} />
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="altText" value={image.altText} />
          {fileField}
          {licenseField}
          <Result state={replaceState} />
          <button className="button button--secondary" disabled={replacing}>
            {replacing ? "Replacing…" : "Replace file"}
          </button>
        </form>
      </details>
    </article>
  );
}
