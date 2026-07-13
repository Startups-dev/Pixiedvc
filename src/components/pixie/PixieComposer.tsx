"use client";

import { Send, Square } from "lucide-react";

const MAX_CHARS = 4000;

export default function PixieComposer({
  value,
  disabled,
  active,
  canSend,
  onChange,
  onSend,
  onCancel,
}: {
  value: string;
  disabled: boolean;
  active: boolean;
  canSend: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="sticky bottom-0 border-t border-slate-100 bg-white p-3">
      <div className="mx-auto max-w-3xl">
        <label htmlFor="pixie-message" className="sr-only">
          Tell Pixie about your trip
        </label>
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-slate-400">
          <textarea
            id="pixie-message"
            value={value}
            disabled={disabled || active}
            maxLength={MAX_CHARS}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) onSend();
              }
            }}
            placeholder="Tell Pixie about your trip..."
            rows={2}
            className="max-h-36 min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {active ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Stop Pixie response"
            >
              <Square className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0f2148] text-white transition hover:bg-[#172f63] disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Send message to Pixie"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        <p className="mt-1 text-right text-[11px] text-slate-400">
          {value.length}/{MAX_CHARS}
        </p>
      </div>
    </div>
  );
}

