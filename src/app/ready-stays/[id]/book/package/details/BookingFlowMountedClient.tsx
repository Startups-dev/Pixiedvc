"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

import BookingFlowClient from "@/app/book/BookingFlowClient";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { GuestInfoInput } from "@pixiedvc/booking-form";

const READY_STAY_DRAFT_KEY = "pixiedvc:readyStaysDraft:v1";

type ReadyStayDraft = {
  readyStayId: string;
  bookingId: string;
  step: "guestInfo" | "summary";
  form: GuestInfoInput;
  updatedAt: number;
};

type MountedProps = {
  prefill: {
    resortId: string;
    resortName: string;
    villaType: string;
    checkIn: string;
    checkOut: string;
    points: number;
    estCash: number;
  };
  resorts: Array<{ id: string; name: string; slug: string | null }>;
  readyStayId: string;
  bookingId: string;
};

export default function BookingFlowMountedClient({
  prefill,
  resorts,
  readyStayId,
  bookingId,
}: MountedProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [mounted, setMounted] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [guestDefaults, setGuestDefaults] = useState<Partial<GuestInfoInput> | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [resolvedBookingId, setResolvedBookingId] = useState(bookingId);

  const redirectPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const buildSignInHref = (email?: string) => {
    const params = new URLSearchParams({
      next: redirectPath,
      intent: "ready-stays",
    });
    const trimmed = (email ?? "").trim();
    if (trimmed) {
      params.set("email", trimmed);
    }
    return `/login?${params.toString()}`;
  };

  const signInHref = useMemo(
    () => buildSignInHref(guestDefaults?.email),
    [guestDefaults?.email, redirectPath],
  );

  const clearDraft = () => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(READY_STAY_DRAFT_KEY);
  };

  const saveDraft = (guest: GuestInfoInput) => {
    if (typeof window === "undefined") return;
    const draft: ReadyStayDraft = {
      readyStayId,
      bookingId: resolvedBookingId,
      step: "guestInfo",
      form: guest,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(READY_STAY_DRAFT_KEY, JSON.stringify(draft));
  };

  const redirectToLogin = (email?: string) => {
    window.location.href = buildSignInHref(email);
  };

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(Boolean(session));
    };

    void loadSession();

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(READY_STAY_DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as ReadyStayDraft;
          if (parsed?.readyStayId === readyStayId) {
            if (parsed.form) {
              setGuestDefaults(parsed.form);
            }
            if (!bookingId && parsed.bookingId) {
              setResolvedBookingId(parsed.bookingId);
            }
          }
        }
      } catch {
        // Ignore malformed drafts and continue with a clean form.
      }
    }
    setMounted(true);
  }, [bookingId, readyStayId, supabase]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-3">
      {authNotice ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {authNotice}
        </p>
      ) : null}
      {submitError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p>{submitError}</p>
          <div className="mt-2">
            <Link href={`/ready-stays/${readyStayId}`} className="text-sm font-semibold underline">
              Back to Ready Stay
            </Link>
          </div>
        </div>
      ) : null}
      <BookingFlowClient
        prefill={prefill}
        resorts={resorts}
        startAtGuestInfo
        flowLabel="Ready Stays booking"
        hideDepositBadge
        stepDisplayOffset={1}
        totalStepsOverride={3}
        guestDefaults={guestDefaults}
        signInHref={isAuthenticated ? undefined : signInHref}
        onSignInClick={(guest) => {
          saveDraft(guest);
        }}
        onGuestInfoSubmit={async (guest: GuestInfoInput) => {
          setAuthNotice(null);
          setSubmitError(null);
          saveDraft(guest);

          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            setAuthNotice("Please sign in to book this stay.");
            redirectToLogin(guest.email);
            return;
          }

          if (!resolvedBookingId) {
            setSubmitError("We couldn’t find that booking package. Please refresh or start again.");
            return;
          }

          const response = await fetch("/api/ready-stays/guest-info", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              readyStayId,
              bookingId: resolvedBookingId,
              bookingPackageId: resolvedBookingId,
              guest,
            }),
          });

          const json = (await response.json().catch(() => null)) as
            | { agreementPath?: string; error?: string }
            | null;

          if (response.status === 401 && json?.error === "AUTH_REQUIRED") {
            setAuthNotice("Please sign in to book this stay.");
            redirectToLogin(guest.email);
            return;
          }

          if (!response.ok || !json?.agreementPath) {
            const code = json?.error ?? "";
            if (
              code === "BOOKING_PACKAGE_ID_REQUIRED" ||
              code === "BOOKING_PACKAGE_NOT_FOUND"
            ) {
              setSubmitError("We couldn’t find that booking package. Please refresh or start again.");
              return;
            }
            setSubmitError("Unable to save guest details. Please try again.");
            return;
          }

          clearDraft();
          window.location.href = json.agreementPath;
        }}
      />
    </div>
  );
}
