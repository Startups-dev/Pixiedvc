"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

import OwnerNavigation from "@/components/owner/shell/OwnerNavigation";

export default function OwnerMobileNav() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[#E7E3DA] bg-white text-[#10224A] shadow-[0_8px_22px_rgba(16,34,74,0.06)] outline-none transition hover:border-[#d9d2c5] focus-visible:ring-2 focus-visible:ring-[#D8B451] focus-visible:ring-offset-2 lg:hidden"
        aria-label="Open owner navigation"
        aria-expanded={open}
      >
        <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[160] lg:hidden" role="dialog" aria-modal="true" aria-label="Owner navigation">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-[#081327]/45"
            onClick={close}
            aria-label="Close owner navigation"
          />
          <div
            ref={drawerRef}
            className="relative flex h-full w-[min(88vw,340px)] flex-col bg-[#10224A] px-5 py-5 text-white shadow-[24px_0_60px_rgba(8,19,39,0.32)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-serif text-[20px] tracking-[0.18em] text-white">
                  HANNA<span className="text-[#E5C05A]">DVC</span>
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-white/45">
                  Owner Portal
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-white/14 text-white/80 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[#E5C05A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10224A]"
                aria-label="Close owner navigation"
              >
                <X className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-8 space-y-7 overflow-y-auto pb-6">
              <div>
                <p className="mb-3 px-3 text-[11px] uppercase tracking-[0.24em] text-white/38">
                  Workspace
                </p>
                <OwnerNavigation section="primary" onNavigate={close} />
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <p className="mb-3 px-3 text-[11px] uppercase tracking-[0.24em] text-white/38">
                  Owner Care
                </p>
                <OwnerNavigation section="secondary" onNavigate={close} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
