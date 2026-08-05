"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";

import SupportPanel from "@/components/support/SupportPanel";

const OPEN_KEY = "pixie_support_widget_open";

export default function SupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const setOpenWithTrace = (next: boolean, reason: string, eventType?: string) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[support/widget/open]", { next, reason, eventType });
    }
    setOpen(next);
  };

  const isExcluded = useMemo(() => {
    if (!pathname) return false;
    return (
      pathname.startsWith("/support") ||
      pathname.startsWith("/affiliate") ||
      pathname.startsWith("/owner") ||
      pathname.startsWith("/my-trip") ||
      pathname.startsWith("/pixie") ||
      pathname.startsWith("/hara")
    );
  }, [pathname]);

  useEffect(() => {
    if (isExcluded) {
      setOpenWithTrace(false, "excluded-route");
    }
  }, [isExcluded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHydrated(true);
    const storedOpen = localStorage.getItem(OPEN_KEY);
    setOpen(storedOpen === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    localStorage.setItem(OPEN_KEY, open ? "1" : "0");
  }, [open, hydrated]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenWithTrace(false, "escape-key", event.type);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (isExcluded) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const activeElement = document.activeElement as HTMLElement | null;
    // Mobile keyboard open can emit a backdrop click while focusing the composer.
    // Ignore close when focus is currently inside the widget panel.
    if (activeElement && panelRef.current?.contains(activeElement)) {
      return;
    }
    if (panelRef.current?.contains(event.target as Node)) {
      return;
    }
    setOpenWithTrace(false, "mobile-backdrop-click", event.type);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[80]">
      {open && (
        <>
          <div className="fixed inset-0 z-[70] bg-slate-900/20 md:hidden" onClick={handleBackdropClick} />
          <div
            ref={panelRef}
            className="relative z-[71] mb-4 w-[400px] max-w-[calc(100vw-24px)]"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <div className="flex h-[520px] max-h-[68vh] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
              <div className="flex-1 overflow-hidden">
                <SupportPanel variant="widget" className="h-full rounded-none border-0 shadow-none" />
              </div>
              <div className="flex items-center justify-end border-t border-slate-800 px-4 py-2">
                <button
                  type="button"
                  onClick={(event) => setOpenWithTrace(false, "close-button", event.type)}
                  className="rounded-full p-1 text-slate-300 hover:text-white"
                  aria-label="Close support"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={(event) => setOpenWithTrace(!open, "launcher-toggle", event.type)}
        className={`group inline-flex h-14 items-center gap-2 rounded-full bg-[linear-gradient(180deg,#182e61,#0f2148)] pl-3 pr-3 text-white shadow-[0_16px_34px_rgba(15,33,72,0.28)] ring-1 ring-white/10 transition-[transform,box-shadow,opacity] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,33,72,0.32)] md:h-14 ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-label="Open concierge support"
        aria-hidden={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/14 shadow-[0_8px_18px_rgba(7,15,34,0.18)]">
          <MessageCircle className="h-4.5 w-4.5" />
        </span>
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-[12px] font-medium tracking-[0.01em] text-white/88 backdrop-blur-sm transition group-hover:bg-white/12 group-hover:text-white">
          Concierge
        </span>
      </button>
    </div>
  );
}
