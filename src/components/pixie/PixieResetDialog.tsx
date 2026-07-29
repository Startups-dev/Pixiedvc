"use client";

import { useEffect, useRef } from "react";

export default function PixieResetDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="pixie-reset-title">
      <button type="button" aria-label="Close reset dialog backdrop" className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 id="pixie-reset-title" className="text-lg font-semibold text-ink">
          Start a new Hara trip?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This clears only the Hara draft in this browser: trip details, messages, recommendations, Ready Stay matches, and plan outline.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="rounded-full bg-[#0f2148] px-4 py-2 text-sm font-semibold text-white">
            Reset trip
          </button>
        </div>
      </div>
    </div>
  );
}
