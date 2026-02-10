'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase';

type UserMenuProps = {
  label: string;
  isAdmin?: boolean;
  userRole?: string | null;
};

export default function UserMenu({ label, isAdmin = false, userRole }: UserMenuProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const isOwner = userRole?.startsWith('owner') || userRole === 'admin';
  const isGuest = userRole === 'guest';

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current || !triggerRef.current) return;
      const target = event.target as Node;
      if (!menuRef.current.contains(target) && !triggerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      setOpen(false);
      router.push('/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [router, signingOut, supabase]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-sm text-white/85 transition hover:border-white/40 hover:text-white"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="truncate max-w-[160px]">{label}</span>
        <svg
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : 'rotate-0'}`}
          viewBox="0 0 12 7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M1 1l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-64 rounded-[18px] border border-white/10 bg-[#0F2148]/[0.72] p-3 text-sm text-white/90 shadow-[0_20px_50px_rgba(15,33,72,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[18px] saturate-[120%]"
        >
          <div className="px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-white/60">Account</div>

          <Link
            href="/my-trip"
            className="block rounded-[10px] px-3 py-2 text-white/90 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            My Trip
          </Link>

          <Link
            href="/plan"
            className="block rounded-[10px] px-3 py-2 text-white/90 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Pixie Booking
          </Link>

          <Link
            href="/guest"
            className="block rounded-[10px] px-3 py-2 text-white/90 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Requests
          </Link>

          <Link
            href="/profile"
            className="block rounded-[10px] px-3 py-2 text-white/90 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>

          <Link
            href="/profile"
            className="block rounded-[10px] px-3 py-2 text-white/90 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>

          {isOwner ? (
            <>
              <div className="mt-2 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-white/60">Owners</div>

              <Link
                href="/owner"
                className="block rounded-[10px] px-3 py-2 text-white/90 transition hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
              >
                Owner Dashboard
              </Link>

              <span className="block cursor-not-allowed rounded-[10px] px-3 py-2 text-white/45">
                My Listings
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/50">
                  Coming soon
                </span>
              </span>

              <span className="block cursor-not-allowed rounded-[10px] px-3 py-2 text-white/45">
                Payouts &amp; History
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/50">
                  Coming soon
                </span>
              </span>

              <span className="block cursor-not-allowed rounded-[10px] px-3 py-2 text-white/45">
                Documents &amp; Agreements
                <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-white/50">
                  Coming soon
                </span>
              </span>
            </>
          ) : null}

          {/* Divider instead of "System" */}
          <div className="my-2 h-px w-full bg-white/10" />

          {isAdmin ? (
            <Link
              href="/admin"
              className="block rounded-[10px] px-3 py-2 text-white/90 transition hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Admin
            </Link>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 w-full rounded-[10px] px-3 py-2 text-left text-white/90 transition hover:bg-red-500/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
