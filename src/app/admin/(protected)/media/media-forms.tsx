"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import type {
  ManagedProductImage,
  MediaLibraryAsset,
} from "@/features/catalog/data/product-media-management";
import {
  addProductImage,
  attachLibraryImage,
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

function UploadFileField() {
  const [preview, setPreview] = useState("");
  return (
    <>
      <label>
        Image{" "}
        <span>JPG, PNG or WebP · 5 MB maximum · at least 800 × 800 px</span>
        <input
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              setPreview("");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => setPreview(String(reader.result));
            reader.readAsDataURL(file);
          }}
        />
      </label>
      {preview && (
        <div className="media-selection-preview">
          <Image
            src={preview}
            alt="Selected upload preview"
            width={180}
            height={180}
            unoptimized
          />
        </div>
      )}
    </>
  );
}
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
      <UploadFileField />
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

export function LibraryImageForm({
  productId,
  slug,
  defaultAlt,
  assets,
  disabled,
}: {
  productId: string;
  slug: string;
  defaultAlt: string;
  assets: readonly MediaLibraryAsset[];
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(attachLibraryImage, initial);
  const [selected, setSelected] = useState("");
  const asset = assets.find((item) => item.id === selected);
  return (
    <form action={action} className="catalog-admin-form media-upload-form">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <label>
        Media Library
        <select
          name="assetId"
          required
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
        >
          <option value="" disabled>
            Select an existing image
          </option>
          {assets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.locator}
            </option>
          ))}
        </select>
      </label>
      {asset && (
        <div className="media-selection-preview">
          <Image
            src={asset.url}
            alt="Selected media preview"
            width={180}
            height={180}
            unoptimized
          />
        </div>
      )}
      <label>
        ALT text
        <input name="altText" required defaultValue={defaultAlt} />
      </label>
      <Result state={state} />
      <button
        className="button button--primary"
        disabled={pending || disabled || !assets.length}
      >
        {disabled
          ? "Gallery limit reached"
          : pending
            ? "Attaching…"
            : "Choose from Media Library"}
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
          <UploadFileField />
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
