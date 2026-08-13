"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  startTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  setCartQuantity,
  type CartQuantityState,
} from "@/features/cart/actions";

const eventName = "reyon-cart-persistence";

export function CartQuantityForm({
  variantId,
  quantity: initialQuantity,
}: {
  variantId: string;
  quantity: number;
}) {
  const [state, action, pending] = useActionState<CartQuantityState, FormData>(
    setCartQuantity,
    {},
  );
  const [quantity, setQuantity] = useState(String(initialQuantity));
  const formRef = useRef<HTMLFormElement>(null);
  const operationId = useId();
  const router = useRouter();
  const persistedQuantity = state.persistedQuantity ?? initialQuantity;
  const dirty = Number(quantity) !== persistedQuantity;

  const announce = useCallback(
    (isPending: boolean) => {
      window.dispatchEvent(
        new CustomEvent(eventName, {
          detail: { operationId, pending: isPending },
        }),
      );
    },
    [operationId],
  );

  useEffect(() => {
    announce(pending);
    if (state.success) router.refresh();
    return () => {
      announce(false);
    };
  }, [announce, pending, router, state.success]);

  return (
    <form
      ref={formRef}
      action={action}
      className="cart-quantity"
      onSubmit={() => announce(true)}
    >
      <input type="hidden" name="variantId" value={variantId} />
      <label>
        Quantity
        <select
          name="quantity"
          value={quantity}
          disabled={pending}
          onChange={(event) => {
            const nextQuantity = event.target.value;
            setQuantity(nextQuantity);
            announce(true);
            if (!formRef.current) return;
            const submission = new FormData(formRef.current);
            submission.set("quantity", nextQuantity);
            startTransition(() => action(submission));
          }}
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <button className="button button--secondary" disabled={pending || !dirty}>
        {pending ? "Saving…" : "Update"}
      </button>
      <button
        className="cart-remove"
        name="intent"
        value="remove"
        disabled={pending}
      >
        Remove
      </button>
      {state.error && (
        <small className="admin-form-error" role="alert">
          {state.error}
        </small>
      )}
      {state.success && (
        <small className="admin-form-success" role="status">
          {state.success}
        </small>
      )}
    </form>
  );
}

export { eventName as cartPersistenceEvent };
