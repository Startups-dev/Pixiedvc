"use client";

import { useEffect, useMemo, useState } from "react";
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

  const isExcluded = useMemo(() => {
    if (!pathname) return false;
    return (
      pathname.startsWith("/support") || pathname.startsWith("/affiliate")
    );
  }, [pathname]);

  useEffect(() => {
    if (isExcluded) {
      setOpen(false);
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
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (isExcluded) {
    return null;
  }

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
              className="rounded-full p-1 text-slate-400 hover:text-slate-600"
              aria-label="Dismiss support teaser"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-[70] bg-slate-900/20 md:hidden" onClick={() => setOpen(false)} />
          <div className="mb-4 w-[400px] max-w-[calc(100vw-24px)]">
            <div className="flex h-[560px] max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
              <div className="flex-1 overflow-hidden">
                <SupportPanel variant="widget" className="h-full rounded-none border-0 shadow-none" />
              </div>
              <div className="flex items-center justify-end border-t border-slate-800 px-4 py-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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
        onClick={() => setOpen((value) => !value)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0F2148] text-white shadow-xl hover:shadow-2xl md:h-14 md:w-14"
        aria-label="Open support"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
