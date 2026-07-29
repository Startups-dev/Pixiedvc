"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import PixiePlanPanel from "@/components/pixie/PixiePlanPanel";
import type { PixieChatState } from "@/lib/pixie/client/types";

export default function PixieMobilePlanDrawer({
  open,
  state,
  onClose,
  onSavePromptShown,
}: {
  open: boolean;
  state: PixieChatState;
  onClose: () => void;
  onSavePromptShown: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="Hara trip plan">
      <button type="button" aria-label="Close plan drawer backdrop" className="absolute inset-0 bg-slate-950/45" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-3xl bg-[#f5f7fb] p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Your Hara plan</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Close plan drawer"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <PixiePlanPanel state={state} onSavePromptShown={onSavePromptShown} />
      </div>
    </div>
  );
}
