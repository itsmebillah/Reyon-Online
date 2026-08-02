"use client";
import { useActionState } from "react";
import type { ManagedCategory } from "@/features/catalog/data/category-management";
import {
  createCategory,
  updateCategory,
  type CategoryActionState,
} from "./actions";
const initial: CategoryActionState = {};
function Result({ state }: { state: CategoryActionState }) {
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
function Fields({
  category,
  categories,
}: {
  category?: ManagedCategory;
  categories: readonly ManagedCategory[];
}) {
  const parents = categories.filter(
    (item) => !item.archivedAt && item.id !== category?.id,
  );
  return (
    <>
      <label>
        Category name
        <input name="name" required defaultValue={category?.name} />
      </label>
      <label>
        Description <span>(optional)</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={category?.description ?? ""}
        />
      </label>
      <div className="form-grid">
        <label>
          Parent category <span>(optional)</span>
          <select name="parentId" defaultValue={category?.parentId ?? ""}>
            <option value="">Top-level category</option>
            {parents.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Display order
          <input
            name="displayOrder"
            type="number"
            step="1"
            defaultValue={category?.displayOrder ?? 0}
          />
        </label>
      </div>
      <label className="publish-choice">
        <input
          name="isVisible"
          type="checkbox"
          defaultChecked={category?.isVisible ?? true}
        />
        <span>
          <strong>Visible in the store</strong>
          <small>
            Hidden categories remain available for internal catalog records.
          </small>
        </span>
      </label>
    </>
  );
}
export function CreateCategoryForm({
  categories,
}: {
  categories: readonly ManagedCategory[];
}) {
  const [state, action, pending] = useActionState(createCategory, initial);
  return (
    <form action={action} className="catalog-admin-form">
      <Fields categories={categories} />
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Creating category…" : "Create category"}
      </button>
    </form>
  );
}
export function EditCategoryForm({
  category,
  categories,
}: {
  category: ManagedCategory;
  categories: readonly ManagedCategory[];
}) {
  const [state, action, pending] = useActionState(updateCategory, initial);
  return (
    <form action={action} className="catalog-admin-form">
      <input type="hidden" name="categoryId" value={category.id} />
      <Fields category={category} categories={categories} />
      <Result state={state} />
      <button className="button button--primary" disabled={pending}>
        {pending ? "Saving changes…" : "Save category"}
      </button>
    </form>
  );
}
