"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Barcode,
  Camera,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { completePosSale, openPosShift } from "@/features/pos/actions";
import { CameraBarcodeScanner } from "@/features/pos/components/camera-barcode-scanner";
import {
  CheckoutModal,
  type CheckoutValue,
} from "@/features/pos/components/checkout-modal";
import { ReceiptModal } from "@/features/pos/components/receipt-modal";
import { useBarcodeScanner } from "@/features/pos/hooks/use-barcode-scanner";
import type {
  PosContext,
  PosProduct,
  PosReceipt,
  PosShift,
} from "@/features/pos/types";

type CartLine = PosProduct & { quantity: number };

export function PosRegister({
  context,
  products,
  shifts,
  defaultTaxRate,
}: {
  context: PosContext;
  products: readonly PosProduct[];
  shifts: readonly PosShift[];
  defaultTaxRate: number;
}) {
  const location = context.locations[0];
  const register = location?.registers[0];
  const openShift = shifts.find(
    (shift) => !shift.closedAt && shift.registerId === register?.id,
  );
  const [shiftId, setShiftId] = useState(openShift?.id ?? "");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [camera, setCamera] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [mobileCart, setMobileCart] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<PosReceipt | null>(null);
  const [openingCash, setOpeningCash] = useState("0");
  const canOpenShift = context.capabilities.includes("pos.open_shift");
  const storageKey = `reyon_pos_cart_${context.userId}_${location?.id ?? "none"}`;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) setCart(JSON.parse(saved) as CartLine[]);
      } catch {
        localStorage.removeItem(storageKey);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);
  useEffect(() => {
    if (!ready) return;
    if (cart.length) localStorage.setItem(storageKey, JSON.stringify(cart));
    else localStorage.removeItem(storageKey);
  }, [cart, ready, storageKey]);
  const add = useCallback(
    (product: PosProduct) =>
      setCart((current) => {
        const existing = current.find((line) => line.id === product.id);
        if (product.stock <= 0 || (existing?.quantity ?? 0) >= product.stock)
          return current;
        return existing
          ? current.map((line) =>
              line.id === product.id
                ? { ...line, quantity: line.quantity + 1 }
                : line,
            )
          : [...current, { ...product, quantity: 1 }];
      }),
    [],
  );
  const scan = useCallback(
    (code: string) => {
      const product = products.find(
        (item) =>
          item.barcode?.toLowerCase() === code.trim().toLowerCase() ||
          item.sku.toLowerCase() === code.trim().toLowerCase(),
      );
      if (product) {
        add(product);
        setFeedback(`Added ${product.name}`);
      } else setFeedback(`Barcode “${code}” not found`);
      window.setTimeout(() => setFeedback(""), 1800);
    },
    [add, products],
  );
  useBarcodeScanner({ onScan: scan, enabled: !checkout && !camera });
  const categories = useMemo(
    () => [
      "ALL",
      ...new Set(products.map((product) => product.category ?? "General")),
    ],
    [products],
  );
  const filtered = products.filter(
    (product) =>
      (category === "ALL" || (product.category ?? "General") === category) &&
      [product.name, product.sku, product.barcode ?? ""].some((value) =>
        value.toLowerCase().includes(query.toLowerCase()),
      ),
  );
  const total = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const quantity = cart.reduce((sum, line) => sum + line.quantity, 0);
  const update = (id: string, delta: number) =>
    setCart((current) =>
      current.flatMap((line) =>
        line.id !== id
          ? [line]
          : line.quantity + delta <= 0
            ? []
            : [
                {
                  ...line,
                  quantity: Math.min(line.stock, line.quantity + delta),
                },
              ],
      ),
    );
  const submit = async (value: CheckoutValue) => {
    if (!location || !register || !shiftId) return;
    setBusy(true);
    setError("");
    const result = await completePosSale({
      ...value,
      idempotencyKey: crypto.randomUUID(),
      locationId: location.id,
      registerId: register.id,
      shiftId,
      items: cart.map((line) => ({
        variantId: line.id,
        quantity: line.quantity,
      })),
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    if (result.data) {
      setCheckout(false);
      setMobileCart(false);
      setCart([]);
      setReceipt(result.data);
    }
  };
  const cartPanel = (
    <aside className={`pos-cart ${mobileCart ? "pos-cart--mobile" : ""}`}>
      <header>
        <strong>
          <ShoppingCart size={18} /> Current Order{" "}
          <span className="pos-badge">{quantity}</span>
        </strong>
        {mobileCart ? (
          <button onClick={() => setMobileCart(false)}>
            <X />
          </button>
        ) : (
          <button onClick={() => setCart([])}>Clear</button>
        )}
      </header>
      <div className="pos-cart__items">
        {!cart.length ? (
          <div className="pos-cart-empty">
            <ShoppingCart size={34} />
            <p>Your cart is empty</p>
            <small>Choose a product or scan a barcode</small>
          </div>
        ) : (
          cart.map((line) => (
            <div className="pos-cart-line" key={line.id}>
              <div className="pos-cart-line__top">
                <div>
                  <strong>{line.name}</strong>
                  <small>
                    {line.variantLabel} · {line.sku}
                  </small>
                </div>
                <button
                  onClick={() => update(line.id, -line.quantity)}
                  aria-label="Remove"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="pos-cart-line__bottom">
                <div className="pos-quantity">
                  <button onClick={() => update(line.id, -1)}>
                    <Minus size={13} />
                  </button>
                  <span>{line.quantity}</span>
                  <button onClick={() => update(line.id, 1)}>
                    <Plus size={13} />
                  </button>
                </div>
                <b>৳{(line.price * line.quantity).toLocaleString()}</b>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="pos-cart__summary">
        <span>
          Items <b>{quantity}</b>
        </span>
        <span className="total">
          Total <b>৳{total.toLocaleString()}</b>
        </span>
        <button
          className="pos-button"
          disabled={!cart.length || !shiftId}
          onClick={() => setCheckout(true)}
        >
          Proceed to checkout
        </button>
        {!shiftId && <small>Open a register shift to begin selling.</small>}
      </div>
    </aside>
  );
  if (!location || !register)
    return (
      <div className="pos-page">
        <div className="pos-panel pos-empty">
          No authorized POS location and active register are assigned to this
          account.
        </div>
      </div>
    );
  return (
    <div className="pos-page">
      <header className="pos-page-header">
        <div>
          <h1>Sales POS</h1>
          <p>Point of Sale Register & Invoice Checkout</p>
        </div>
        {shiftId ? (
          <span className="pos-badge">Shift open · {register.name}</span>
        ) : (
          <span className="pos-badge pos-badge--danger">Register closed</span>
        )}
      </header>
      {!shiftId && (
        <section className="pos-panel" style={{ marginBottom: 18 }}>
          <h2>Register Closed</h2>
          {canOpenShift ? (
            <>
              <p>Count the starting cash drawer before the first sale.</p>
              <div className="pos-toolbar">
                <div className="pos-field">
                  <label>Opening cash</label>
                  <input
                    type="number"
                    min="0"
                    value={openingCash}
                    onChange={(event) => setOpeningCash(event.target.value)}
                  />
                </div>
                <button
                  className="pos-button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const result = await openPosShift({
                      registerId: register.id,
                      openingCash: Number(openingCash) || 0,
                    });
                    setBusy(false);
                    if (result.error) setError(result.error);
                    else if (result.data) setShiftId(result.data);
                  }}
                >
                  Open Register / Start Shift
                </button>
              </div>
            </>
          ) : (
            <p className="pos-form-message">
              Your account does not have permission to open this register.
            </p>
          )}
          {error && <p className="pos-form-message">{error}</p>}
        </section>
      )}
      <div className="pos-toolbar">
        <div className="pos-search">
          <Search size={18} />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by product, SKU, or scan barcode…"
          />
        </div>
        <button className="pos-button" onClick={() => setCamera(true)}>
          <Camera size={18} />
          <span>Camera Scan</span>
        </button>
      </div>
      {feedback && (
        <div className="pos-feedback">
          <Barcode size={15} /> {feedback}
        </div>
      )}
      <div className="pos-categories">
        {categories.map((item) => (
          <button
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="pos-register-grid">
        <section className="pos-products">
          {filtered.map((product) => (
            <button
              className="pos-product"
              onClick={() => add(product)}
              disabled={product.stock <= 0}
              key={product.id}
            >
              <div className="pos-product__image">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt=""
                    width={320}
                    height={220}
                    unoptimized
                  />
                ) : (
                  <Package size={34} />
                )}
              </div>
              <div className="pos-product__body">
                <strong>{product.name}</strong>
                <small>
                  {product.variantLabel} · {product.sku}
                </small>
                <div className="pos-product__bottom">
                  <span className="pos-product__price">
                    ৳{Number(product.price).toLocaleString()}
                  </span>
                  <span
                    className={`pos-stock ${product.stock <= 0 ? "out" : product.stock <= 5 ? "low" : ""}`}
                  >
                    {product.stock <= 0 ? "Out" : `${product.stock} in stock`}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </section>
        {cartPanel}
      </div>
      {!!cart.length && (
        <button
          className="pos-button pos-mobile-cart-button"
          onClick={() => setMobileCart(true)}
        >
          <ShoppingCart /> {quantity} {quantity === 1 ? "item" : "items"}
          <span>৳{total.toLocaleString()}</span>
        </button>
      )}
      <CameraBarcodeScanner
        open={camera}
        onClose={() => setCamera(false)}
        onScan={scan}
      />
      {checkout && (
        <CheckoutModal
          subtotal={total}
          defaultTaxRate={defaultTaxRate}
          canRecordDue={context.capabilities.includes("pos.record_due")}
          busy={busy}
          error={error}
          onClose={() => {
            if (!busy) setCheckout(false);
          }}
          onSubmit={submit}
        />
      )}
      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
