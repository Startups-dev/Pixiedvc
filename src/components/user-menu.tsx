'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

import { createClient } from '@/lib/supabase';
import type { DashboardDestination } from '@/lib/routes/home';

type UserMenuProps = {
  label: string;
  dashboards?: DashboardDestination[];
  // Retained for the existing affiliate header until its later integration.
  isAdmin?: boolean;
  // Legacy snapshot compatibility only; this is never used to derive access.
  userRole?: string | null;
  variant?: 'public' | 'owner' | 'inline';
  triggerContent?: ReactNode;
  currentDashboard?: DashboardDestination['id'];
  onNavigate?: () => void;
};

export default function UserMenu({
  label, dashboards, isAdmin = false, variant = 'public', triggerContent, currentDashboard, onNavigate,
}: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const owner = variant === 'owner';
  const inline = variant === 'inline';
  const destinations = dashboards ?? [
    ...(isAdmin ? [{ id: 'admin' as const, label: 'Admin', href: '/admin' }] : []),
    { id: 'guest' as const, label: 'My Trip', href: '/my-trip' },
  ];
  const hasActiveOwner = destinations.some((item) => item.id === 'owner' && item.href === '/owner/dashboard');
  const itemClass = owner
    ? 'block rounded-[12px] px-3 py-2 outline-none transition hover:bg-[#FAFAF8] focus-visible:bg-[#FAFAF8]'
    : 'block rounded-[10px] px-3 py-2 text-white/90 outline-none transition hover:bg-white/10 focus-visible:bg-white/10';
  const headingClass = owner
    ? 'px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-[#64748B]'
    : 'px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-white/60';

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const handleLogout = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await createClient().auth.signOut();
      setOpen(false);
      onNavigate?.();
      router.push('/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [onNavigate, router, signingOut]);

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  const link = (href: string, text: string) => (
    <Link href={href} role={inline ? undefined : 'menuitem'} className={itemClass} onClick={close}>
      {text}
    </Link>
  );

  return (
    <div className="relative">
      {!inline ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={owner
            ? 'inline-flex min-h-12 items-center gap-3 rounded-full border border-[#E7E3DA] bg-white px-3 py-2 text-sm font-medium text-[#0F1B33] shadow-[0_10px_25px_rgba(15,27,51,0.055)] outline-none transition hover:border-[#D4AF37]/45 focus-visible:ring-2 focus-visible:ring-[#D8B451] focus-visible:ring-offset-2'
            : 'flex items-center gap-2 rounded-full border border-white/20 px-4 py-1 text-sm text-white/85 transition hover:border-white/40 hover:text-white'}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={owner ? label + ' account menu' : undefined}
        >
          {triggerContent ?? <span className="max-w-[160px] truncate">{label}</span>}
          <svg className={(owner ? 'h-3.5 w-3.5' : 'h-3 w-3') + ' transition-transform' + (open ? ' rotate-180' : '')} viewBox="0 0 12 7" fill="none" aria-hidden="true">
            <path d="M1 1l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}
      {open || inline ? (
        <div
          ref={menuRef}
          role={inline ? undefined : 'menu'}
          aria-label={inline ? undefined : 'Account'}
          className={owner
            ? 'absolute right-0 z-50 mt-2 max-h-[calc(100dvh-96px)] w-56 overflow-y-auto rounded-[16px] border border-[#E7E3DA] bg-white p-2 text-sm text-[#10224A] shadow-[0_20px_45px_rgba(16,34,74,0.14)]'
            : inline ? 'grid gap-1 text-sm text-white/90'
              : 'absolute right-0 z-50 mt-2 max-h-[calc(100dvh-160px)] w-64 overflow-y-auto rounded-[18px] border border-white/10 bg-[#0F2148]/[0.72] p-3 text-sm text-white/90 shadow-[0_20px_50px_rgba(15,33,72,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-[18px] saturate-[120%]'}
        >
          {destinations.length ? <div className={headingClass}>Dashboards</div> : null}
          {destinations.map((destination) => (
            <Link
              key={destination.id}
              href={destination.href}
              role={inline ? undefined : 'menuitem'}
              aria-current={destination.id === currentDashboard ? 'page' : undefined}
              className={itemClass}
              onClick={close}
            >
              {destination.label}
            </Link>
          ))}
          {owner ? (
            <>
              <div className="my-1 h-px bg-[#E7E3DA]" />
              {link('/owner/account', 'Account settings')}
              {link('/owner/notifications', 'Notifications')}
            </>
          ) : (
            <>
              {hasActiveOwner ? (
                <>
                  <div className={headingClass}>Owner tools</div>
                  {link('/owner/ready-stays', 'Ready Stays')}
                  {link('/owner/rewards', 'Earnings & Rewards')}
                </>
              ) : null}
              <div className={headingClass}>Travel</div>
              {link('/plan', 'HannaDVC Booking')}
              {link('/guest', 'Requests')}
              {link('/guest/rewards', 'Guest Rewards')}
              <div className={headingClass}>Account</div>
              {link('/profile', 'Profile')}
              {link('/profile', 'Settings')}
            </>
          )}
          <div className={owner ? 'my-1 h-px bg-[#E7E3DA]' : 'my-1 h-px bg-white/10'} />
          <button
            type="button"
            role={inline ? undefined : 'menuitem'}
            onClick={handleLogout}
            disabled={signingOut}
            className={itemClass + ' flex w-full items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ' + (owner ? 'hover:bg-red-50' : 'hover:bg-red-500/20')}
          >
            {owner ? <LogOut className="h-4 w-4" aria-hidden="true" /> : null}
            {owner ? (signingOut ? 'Signing out...' : 'Sign out') : (signingOut ? 'Signing out…' : 'Logout')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
