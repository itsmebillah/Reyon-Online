"use client";

import { useEffect, useRef } from "react";

export function useBarcodeScanner({
  onScan,
  enabled = true,
}: {
  onScan: (barcode: string) => void;
  enabled?: boolean;
}) {
  const buffer = useRef("");
  const lastKey = useRef(0);
  const fastKeys = useRef(0);
  const callback = useRef(onScan);
  useEffect(() => void (callback.current = onScan), [onScan]);
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const now = Date.now();
      const rapid = now - lastKey.current <= 50;
      lastKey.current = now;
      if (event.key === "Enter") {
        const code = buffer.current.trim();
        const isScanner = fastKeys.current >= 2;
        buffer.current = "";
        fastKeys.current = 0;
        if (code.length >= 3 && isScanner) {
          event.preventDefault();
          callback.current(code);
        }
        return;
      }
      if (event.key.length === 1) {
        if (!rapid) {
          buffer.current = "";
          fastKeys.current = 0;
        } else fastKeys.current += 1;
        buffer.current += event.key;
        window.setTimeout(() => {
          if (Date.now() - lastKey.current >= 200) {
            buffer.current = "";
            fastKeys.current = 0;
          }
        }, 250);
      }
    };
    window.addEventListener("keydown", listener, true);
    return () => window.removeEventListener("keydown", listener, true);
  }, [enabled]);
}
