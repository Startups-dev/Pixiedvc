'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase';

type UserMenuProps = {
  label: string;
  isAdmin?: boolean;
};

export default function UserMenu({ label, isAdmin = false }: UserMenuProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current || !triggerRef.current) {
        return;
      }
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
    if (signingOut) {
      return;
    }
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
          <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/15 bg-[#0f2148]/95 p-2 text-sm text-white/80 shadow-[0_18px_36px_rgba(15,33,72,0.42)] backdrop-blur"
        >
          <div className="px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/50">Account</div>
          <Link
            href="/profile"
            className="block rounded-xl px-3 py-2 text-white/85 transition hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            Profile
          </Link>
          {isAdmin ? (
            <Link
              href="/admin"
              className="block rounded-xl px-3 py-2 text-white/85 transition hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
            >
              Admin
            </Link>
          ) : null}
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 w-full rounded-xl px-3 py-2 text-left text-white/85 transition hover:bg-red-500/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={signingOut}
          >
            {signingOut ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
