"use client";

import { useActionState } from "react";
import type { ManagedCollection } from "@/features/catalog/data/collection-management";
import {
  addCollectionPin,
  updateCollection,
  type CollectionActionState,
} from "./actions";

type ProductOption = Readonly<{
  id: string;
  name: string;
  brand: string;
  status: string;
}>;
const initial: CollectionActionState = {};

function Result({ state }: { state: CollectionActionState }) {
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

export function CollectionSettingsForm({
  collection,
}: {
  collection: ManagedCollection;
}) {
  const [state, action, pending] = useActionState(updateCollection, initial);
  return (
    <form action={action} className="catalog-admin-form">
      <input type="hidden" name="collectionId" value={collection.id} />
      <div className="form-grid">
        <label>
          Display name
          <input name="name" required defaultValue={collection.name} />
        </label>
        <label>
          Display order
          <input
            name="displayOrder"
            type="number"
            min="0"
            defaultValue={collection.displayOrder}
          />
        </label>
        <label>
          Maximum products
          <input
            name="itemLimit"
            type="number"
            min="1"
            max="24"
            defaultValue={collection.itemLimit}
          />
        </label>
        <label>
          Ranking period <span>(days, optional)</span>
          <input
            name="rankingPeriodDays"
            type="number"
            min="1"
            max="3650"
            defaultValue={collection.rankingPeriodDays ?? ""}
          />
        </label>
        <label>
          Low-stock threshold <span>(optional)</span>
          <input
            name="lowStockThreshold"
            type="number"
            min="0"
            defaultValue={collection.lowStockThreshold ?? ""}
          />
        </label>
      </div>
      <label className="publish-choice">
        <input
          name="isEnabled"
          type="checkbox"
          defaultChecked={collection.isEnabled}
        />
        <span>
          <strong>Show this collection</strong>
          <small>Only eligible Published products can appear.</small>
        </span>
      </label>
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

export function AddPinForm({
  collectionId,
  products,
}: {
  collectionId: string;
  products: readonly ProductOption[];
}) {
  const [state, action, pending] = useActionState(addCollectionPin, initial);
  const published = products.filter(
    (product) => product.status === "published",
  );
  return (
    <form action={action} className="collection-pin-form">
      <input type="hidden" name="collectionId" value={collectionId} />
      <label>
        Pin a published product
        <select name="productId" required defaultValue="">
          <option value="" disabled>
            Choose product
          </option>
          {published.map((product) => (
            <option key={product.id} value={product.id}>
              {product.brand} — {product.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Order
        <input name="pinOrder" type="number" min="0" defaultValue="0" />
      </label>
      <Result state={state} />
      <button
        className="button button--secondary"
        disabled={pending || !published.length}
      >
        {pending ? "Pinning…" : "Pin product"}
      </button>
    </form>
  );
}
