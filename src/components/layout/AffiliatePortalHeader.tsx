"use client";

import Link from "next/link";
import Image from "next/image";

import UserMenu from "@/components/user-menu";

type AffiliatePortalHeaderProps = {
  userLabel: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
};

export default function AffiliatePortalHeader({
  userLabel,
  isAdmin,
  isAuthenticated,
}: AffiliatePortalHeaderProps) {
  return (
    <header className="relative z-[60]">
      <div className="w-full border-b border-white/10 bg-[#0f2148]">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/pixiedvc-logo.png"
                alt="PixieDVC"
                width={160}
                height={32}
                priority
                className="h-7 w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.18)]"
              />
            </Link>
            <span className="text-xs uppercase tracking-[0.22em] text-white/70">
              Affiliate Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-white/80 transition hover:text-white">
              Back to PixieDVC
            </Link>
            {isAuthenticated ? (
              <UserMenu label={userLabel ?? "Signed in"} isAdmin={isAdmin} />
            ) : (
              <Link
                href="/login"
                className="rounded-full border border-white/40 px-4 py-1 text-sm text-white/85 transition hover:text-white"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
