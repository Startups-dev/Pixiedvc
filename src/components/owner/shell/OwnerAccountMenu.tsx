"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserRound } from "lucide-react";

import { createClient } from "@/lib/supabase";

export default function OwnerAccountMenu() {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleLogout = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      setOpen(false);
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [router, signingOut]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#E7E3DA] bg-white px-3 py-2 text-sm font-medium text-[#10224A] shadow-[0_8px_22px_rgba(16,34,74,0.06)] outline-none transition hover:border-[#d9d2c5] focus-visible:ring-2 focus-visible:ring-[#D8B451] focus-visible:ring-offset-2"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#E7E3DA] bg-[#FAFAF8] text-[#B68A2E]">
          <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline">Owner</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-[16px] border border-[#E7E3DA] bg-white p-2 text-sm text-[#10224A] shadow-[0_20px_45px_rgba(16,34,74,0.14)]"
        >
          <Link
            href="/owner/memberships"
            role="menuitem"
            className="block rounded-[12px] px-3 py-2 outline-none transition hover:bg-[#FAFAF8] focus-visible:bg-[#FAFAF8]"
            onClick={() => setOpen(false)}
          >
            Account settings
          </Link>
          <Link
            href="/owner/notifications"
            role="menuitem"
            className="block rounded-[12px] px-3 py-2 outline-none transition hover:bg-[#FAFAF8] focus-visible:bg-[#FAFAF8]"
            onClick={() => setOpen(false)}
          >
            Notifications
          </Link>
          <div className="my-1 h-px bg-[#E7E3DA]" />
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={signingOut}
            className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left outline-none transition hover:bg-red-50 focus-visible:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
