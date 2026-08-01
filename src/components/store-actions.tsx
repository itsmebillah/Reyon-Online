"use client";

import { Heart, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/data/catalog";
import { Button } from "./ui";

export function ProductActions({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [quickView, setQuickView] = useState(false);
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
          onClick={() => notify(`${product.name} added to your bag`)}
        >
          <ShoppingBag size={17} />
          {compact ? "Add" : "Add to bag"}
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
            <p className="eyebrow">{product.brand}</p>
            <h2 id="quick-title">{product.name}</h2>
            <p>{product.description}</p>
            <p className="muted">
              {product.size} · {product.stock}
            </p>
            <Button
              onClick={() => {
                notify(`${product.name} added to your bag`);
                setQuickView(false);
              }}
            >
              Add to bag
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
