"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, SwitchCamera, X, Zap } from "lucide-react";

type Detector = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

export function CameraBarcodeScanner({
  open,
  onClose,
  onScan,
}: {
  open: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const frame = useRef<number | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState("");
  const stop = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);
  useEffect(() => {
    if (!open) return stop;
    let cancelled = false;
    async function start() {
      try {
        setError("");
        const BarcodeDetectorClass = (
          window as unknown as {
            BarcodeDetector?: new (options: { formats: string[] }) => Detector;
          }
        ).BarcodeDetector;
        if (!BarcodeDetectorClass)
          throw new Error(
            "Camera barcode scanning is not supported by this browser. Use a hardware scanner or enter the barcode in search.",
          );
        const detector = new BarcodeDetectorClass({
          formats: [
            "code_128",
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "code_39",
            "qr_code",
          ],
        });
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled)
          return media.getTracks().forEach((track) => track.stop());
        stream.current = media;
        if (!video.current) return;
        video.current.srcObject = media;
        await video.current.play();
        let last = "";
        let lastTime = 0;
        const scan = async () => {
          if (!video.current || cancelled) return;
          try {
            const result = await detector.detect(video.current);
            const code = result[0]?.rawValue?.trim();
            if (code && (code !== last || Date.now() - lastTime > 1500)) {
              last = code;
              lastTime = Date.now();
              onScan(code);
            }
          } catch {
            /* keep scanning transient frames */
          }
          frame.current = requestAnimationFrame(scan);
        };
        scan();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Unable to start camera.",
        );
      }
    }
    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [facing, onScan, open, stop]);
  if (!open) return null;
  return (
    <div className="pos-modal-backdrop">
      <section
        className="pos-scanner-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Scan barcode"
      >
        <header>
          <span>
            <Camera /> Scan Barcode
          </span>
          <button onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="pos-viewfinder">
          {error ? (
            <div className="pos-scanner-error">
              <AlertCircle />
              <p>{error}</p>
            </div>
          ) : (
            <>
              <video ref={video} muted playsInline />
              <span className="pos-scan-frame" />
            </>
          )}
        </div>
        <footer>
          <button
            className="pos-button pos-button--ghost"
            onClick={() =>
              setFacing((value) =>
                value === "environment" ? "user" : "environment",
              )
            }
          >
            <SwitchCamera /> Switch camera
          </button>
          <span>
            <Zap size={16} /> Continuous scan
          </span>
          <button className="pos-button" onClick={onClose}>
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
