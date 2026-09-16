"use client";
import { useState } from "react";
import {
  closePosShift,
  openPosShift,
  recordPosCashEvent,
} from "@/features/pos/actions";
import type { PosRegister, PosShift } from "@/features/pos/types";
export function ShiftControls({
  register,
  openShift,
  canOpen,
  canClose,
  canRecordCash,
}: {
  register: PosRegister;
  openShift?: PosShift;
  canOpen: boolean;
  canClose: boolean;
  canRecordCash: boolean;
}) {
  const [cash, setCash] = useState(openShift ? "" : "0");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [eventType, setEventType] = useState<"cash-in" | "cash-out">("cash-in");
  const [eventAmount, setEventAmount] = useState("");
  const [eventReason, setEventReason] = useState("");
  return (
    <section className="pos-panel">
      <h2>{openShift ? `Close ${register.name}` : `Open ${register.name}`}</h2>
      {openShift && (
        <p>
          Opened {new Date(openShift.openedAt).toLocaleString("en-BD")} with ৳
          {Number(openShift.openingCash).toLocaleString()}.
        </p>
      )}
      {(openShift ? canClose : canOpen) && (
        <div className="pos-fields">
          <div className="pos-field">
            <label>{openShift ? "Counted closing cash" : "Opening cash"}</label>
            <input
              type="number"
              min="0"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
          </div>
          {openShift && (
            <div className="pos-field">
              <label>Closing note</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional variance note"
              />
            </div>
          )}
        </div>
      )}
      {status && (
        <p
          className={`pos-form-message ${status.startsWith("Saved") ? "success" : ""}`}
        >
          {status}
        </p>
      )}
      {(openShift ? canClose : canOpen) ? (
        <button
          className="pos-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const result = openShift
              ? await closePosShift({
                  shiftId: openShift.id,
                  closingCash: Number(cash),
                  note,
                })
              : await openPosShift({
                  registerId: register.id,
                  openingCash: Number(cash),
                });
            setBusy(false);
            setStatus(result.error ?? "Saved. Refreshing shift state…");
          }}
        >
          {busy ? "Saving…" : openShift ? "Close shift" : "Open shift"}
        </button>
      ) : (
        <p className="pos-form-message">
          Your account does not have permission to{" "}
          {openShift ? "close" : "open"} this register.
        </p>
      )}
      {openShift && canRecordCash && (
        <section className="pos-section" style={{ marginTop: 16 }}>
          <h3>Cash in / cash out</h3>
          <div className="pos-fields">
            <div className="pos-field">
              <label>Event</label>
              <select
                value={eventType}
                onChange={(event) =>
                  setEventType(event.target.value as "cash-in" | "cash-out")
                }
              >
                <option value="cash-in">Cash in</option>
                <option value="cash-out">Cash out</option>
              </select>
            </div>
            <div className="pos-field">
              <label>Amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={eventAmount}
                onChange={(event) => setEventAmount(event.target.value)}
              />
            </div>
            <div className="pos-field pos-field--wide">
              <label>Reason</label>
              <input
                value={eventReason}
                onChange={(event) => setEventReason(event.target.value)}
                placeholder="Required reason"
              />
            </div>
          </div>
          <button
            className="pos-button pos-button--ghost"
            disabled={busy || !eventReason || Number(eventAmount) <= 0}
            onClick={async () => {
              setBusy(true);
              const result = await recordPosCashEvent({
                shiftId: openShift.id,
                eventType,
                amount: Number(eventAmount),
                reason: eventReason,
              });
              setBusy(false);
              setStatus(result.error ?? "Saved cash event.");
              if (!result.error) {
                setEventAmount("");
                setEventReason("");
              }
            }}
          >
            Record cash event
          </button>
        </section>
      )}
    </section>
  );
}
