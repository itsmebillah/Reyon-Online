"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCartItem } from "@/features/cart/actions";
import { formatMoney, type CatalogProduct } from "@/features/catalog";
export function ProductActions({
  product,
  compact = false,
}: {
  product: CatalogProduct;
  compact?: boolean;
}) {
  const variants = product.variants ?? [];
  const [id, setId] = useState(variants[0]?.id ?? product.variant.id ?? "");
  const selected = variants.find((v) => v.id === id);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const unavailable = selected
    ? selected.available < 1
    : product.offer.availabilityLabel === "Out of stock";
  const add = (buy = false) =>
    start(async () => {
      try {
        const result = await addCartItem(product.id, id);
        setMessage(result.error ?? result.success ?? "");
        if (!result.error) {
          window.dispatchEvent(
            new CustomEvent("reyon:cart-updated", { detail: result.count }),
          );
          if (buy) router.push("/checkout");
        }
      } catch {
        setMessage("Unable to update your bag. Please try again.");
      }
    });
  return (
    <div className="watch-purchase">
      {!compact && (
        <>
          <label>
            Choose your watch
            <select
              aria-label="Watch variant"
              value={id}
              onChange={(e) => setId(e.target.value)}
            >
              {variants.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.label}
                  {v.available < 1 ? " — out of stock" : ""}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <>
              <p className="price price--large">
                {formatMoney({ amount: selected.price, currency: "BDT" })}{" "}
                {selected.compareAtPrice &&
                selected.compareAtPrice > selected.price ? (
                  <del>
                    {formatMoney({
                      amount: selected.compareAtPrice,
                      currency: "BDT",
                    })}
                  </del>
                ) : null}
              </p>
              <p className="stock-label">
                {selected.available > 0 ? "In stock" : "Out of stock"} · SKU{" "}
                {selected.sku}
              </p>
            </>
          )}
        </>
      )}
      {compact && variants.length > 1 ? (
        <a
          className="button button--secondary"
          href={"/products/" + product.slug}
        >
          Choose options ↗
        </a>
      ) : (
        <div className="button-row">
          <button
            className="button button--primary"
            disabled={pending || unavailable || !id}
            onClick={() => add()}
          >
            {pending ? "Adding…" : unavailable ? "Out of stock" : "Add to cart"}
          </button>
          {!compact && (
            <button
              className="button button--secondary"
              disabled={pending || unavailable || !id}
              onClick={() => add(true)}
            >
              Buy now
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="purchase-feedback">
          {message}
        </p>
      )}
    </div>
  );
}
