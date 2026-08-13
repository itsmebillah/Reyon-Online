"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartPersistenceEvent } from "./cart-quantity-form";

export function CheckoutLink() {
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (
        event as CustomEvent<{ operationId: string; pending: boolean }>
      ).detail;
      setPendingOperations((current) => {
        const next = new Set(current);
        if (detail.pending) next.add(detail.operationId);
        else next.delete(detail.operationId);
        return next;
      });
    };
    window.addEventListener(cartPersistenceEvent, listener);
    return () => window.removeEventListener(cartPersistenceEvent, listener);
  }, []);

  if (pendingOperations.size)
    return (
      <span className="button button--primary" aria-disabled="true">
        Saving quantity…
      </span>
    );
  return (
    <Link className="button button--primary" href="/checkout">
      Continue to checkout
    </Link>
  );
}
