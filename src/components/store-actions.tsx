"use client";

import { Heart, ShoppingBag, X } from "lucide-react";
import { useState, useTransition } from "react";
import { addCartItem } from "@/features/cart/actions";
import type { CatalogProduct } from "@/features/catalog";
import { Button } from "./ui";

export function ProductActions({
  product,
  compact = false,
}: {
  product: CatalogProduct;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [quickView, setQuickView] = useState(false);
  const isOutOfStock = product.offer.availabilityLabel === "Out of stock";
  const [adding, startAdding] = useTransition();
  const addToCart = () =>
    startAdding(async () => {
      const result = await addCartItem(product.id);
      notify(result.error ?? result.success ?? "");
      if (!result.error) window.dispatchEvent(new Event("reyon:cart-updated"));
    });
  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2200);
  };
  return (
    <>
      <div className="product-actions">
        <button
          className={`icon-button ${saved ? "is-active" : ""}`}
          aria-label={
            saved
              ? `Remove ${product.name} from wishlist`
              : `Save ${product.name} to wishlist`
          }
          aria-pressed={saved}
          onClick={() => {
            setSaved(!saved);
            notify(
              saved ? "Removed from your wishlist" : "Saved to your wishlist",
            );
          }}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <button className="quick-view" onClick={() => setQuickView(true)}>
          Quick view
        </button>
        <Button
          className="add-button"
          disabled={isOutOfStock || adding}
          onClick={addToCart}
        >
          <ShoppingBag size={17} />
          {isOutOfStock
            ? "Out of stock"
            : adding
              ? "Adding…"
              : compact
                ? "Add"
                : "Add to bag"}
        </Button>
      </div>
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
      {quickView && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setQuickView(false)}
        >
          <div
            className="quick-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close quick view"
              onClick={() => setQuickView(false)}
            >
              <X />
            </button>
            <p className="eyebrow">{product.brand.name}</p>
            <h2 id="quick-title">{product.name}</h2>
            <p>{product.content.summary}</p>
            <p className="muted">
              {product.variant.label} · {product.offer.availabilityLabel}
            </p>
            <Button
              disabled={isOutOfStock}
              onClick={() => {
                addToCart();
                setQuickView(false);
              }}
            >
              {isOutOfStock ? "Out of stock" : "Add to bag"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
