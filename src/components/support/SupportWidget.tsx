"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";

import SupportPanel from "@/components/support/SupportPanel";

const OPEN_KEY = "pixie_support_widget_open";
const TEASER_KEY = "pixie_support_teaser_dismissed";

export default function SupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [teaserDismissed, setTeaserDismissed] = useState(false);
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
      pathname.startsWith("/support") || pathname.startsWith("/affiliate")
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
    const storedTeaser = localStorage.getItem(TEASER_KEY);
    setOpen(storedOpen === "1");
    setTeaserDismissed(storedTeaser === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    if (open) {
      localStorage.setItem(TEASER_KEY, "1");
      setTeaserDismissed(true);
    }
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
      {!teaserDismissed && (
        <div className="mb-3 flex items-center justify-end">
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            <span>Need help?</span>
            <button
              type="button"
              onClick={() => {
                setTeaserDismissed(true);
                if (typeof window !== "undefined") {
                  localStorage.setItem(TEASER_KEY, "1");
                }
              }}
              className="rounded-full p-1 text-slate-400 hover:text-slate-500"
              aria-label="Dismiss support teaser"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-[70] bg-slate-900/20 md:hidden" onClick={handleBackdropClick} />
          <div
            ref={panelRef}
            className="relative z-[71] mb-4 w-[400px] max-w-[calc(100vw-24px)]"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
          >
            <div className="flex h-[560px] max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
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
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-[#0F2148] text-white shadow-xl transition-opacity hover:shadow-2xl md:h-14 md:w-14 ${
          open ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
        aria-label="Open support"
        aria-hidden={open}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
