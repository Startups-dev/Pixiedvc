"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type BookingStatus = {
  deposit_paid?: number | null;
  deposit_currency?: string | null;
  status?: string | null;
  reason?: string | null;
};

const MAX_POLLS = 15;
const DELAYED_THRESHOLD = 8;

type ViewState =
  | "checking"
  | "confirmed"
  | "delayed"
  | "notFound"
  | "unauthorized"
  | "error";

export default function DepositSuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawBookingId = useMemo(
    () => searchParams.get("booking_request_id") ?? "",
    [searchParams],
  );
  const paymentId = useMemo(
    () => searchParams.get("paymentId") ?? searchParams.get("payment_id") ?? "",
    [searchParams],
  );
  const sessionId = useMemo(
    () => searchParams.get("session_id") ?? "",
    [searchParams],
  );
  const [resolvedBookingId, setResolvedBookingId] = useState("");
  const bookingId = rawBookingId || resolvedBookingId;
  const [status, setStatus] = useState<BookingStatus | null>(null);
  const [polls, setPolls] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>("checking");
  const [pollKey, setPollKey] = useState(0);
  const pollingStoppedRef = useRef(false);
  const redirectingRef = useRef(false);
  const reconcileAttemptedRef = useRef(false);

  const isSuccessState = (next: BookingStatus | null) => {
    if (!next) return false;
    if (typeof next.deposit_paid === "number" && next.deposit_paid > 0) return true;
    const state = (next.status ?? "").toLowerCase();
    return (
      state === "submitted" ||
      state === "paid" ||
      state === "confirmed" ||
      state === "deposit_received"
    );
  };
  const nextUrl = paymentId
    ? `/receipt/${encodeURIComponent(paymentId)}`
    : "/requests";

  useEffect(() => {
    if (!bookingId && sessionId) {
      let cancelled = false;
      fetch(`/api/booking/resolve?session_id=${encodeURIComponent(sessionId)}`)
        .then(async (response) => {
          const json = (await response.json()) as {
            booking_request_id?: string | null;
            error?: string;
          };
          if (cancelled) return;
          if (response.ok && json.booking_request_id) {
            setResolvedBookingId(json.booking_request_id);
          } else if (!rawBookingId) {
            setViewState("error");
            setError(json.error ?? "Missing booking id.");
          }
        })
        .catch(() => {
          if (!rawBookingId) {
            setViewState("error");
            setError("Missing booking id.");
          }
        });
      return () => {
        cancelled = true;
      };
    }
  }, [bookingId, rawBookingId, sessionId]);

  useEffect(() => {
    if (!bookingId) {
      setViewState("error");
      setError("Missing booking id.");
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    pollingStoppedRef.current = false;

    const schedule = (attempt: number) => {
      if (cancelled || pollingStoppedRef.current) return;
      const delay = attempt <= 5 ? 1000 : attempt <= 10 ? 2000 : 3000;
      timeoutId = setTimeout(async () => {
        if (cancelled || pollingStoppedRef.current) return;
        setPolls((prev) => prev + 1);
        try {
          if (process.env.NODE_ENV !== "production") {
            console.info("[deposit-success] poll", {
              booking_request_id: bookingId,
            });
          }
          const response = await fetch(
            `/api/booking/status?id=${encodeURIComponent(bookingId)}`,
          );
          const json = (await response.json()) as BookingStatus & {
            error?: string;
          };
          if (process.env.NODE_ENV !== "production") {
            console.info("[deposit-success] poll result", {
              status: response.status,
              deposit_paid: json.deposit_paid ?? null,
            });
          }
          if (!response.ok) {
            if (response.status === 401) {
              setViewState("unauthorized");
              setError(null);
              return;
            }
            if (response.status === 404) {
              setViewState("notFound");
              setError(null);
              return;
            }
            setViewState("error");
            setError(json.error ?? "Unable to verify deposit.");
            return;
          }
          setStatus(json);
          if (isSuccessState(json)) {
            pollingStoppedRef.current = true;
            setViewState("confirmed");
            if (!redirectingRef.current) {
              redirectingRef.current = true;
              router.replace(nextUrl || "/");
            }
            return;
          }

          if (
            sessionId &&
            !reconcileAttemptedRef.current &&
            attempt >= DELAYED_THRESHOLD
          ) {
            reconcileAttemptedRef.current = true;
            try {
              const reconcile = await fetch(
                `/api/booking/deposit/confirm?session_id=${encodeURIComponent(sessionId)}&format=json`,
              );
              if (reconcile.ok && process.env.NODE_ENV !== "production") {
                const reconcileJson = (await reconcile.json()) as {
                  confirmed?: boolean;
                  booking_request_id?: string | null;
                };
                console.info("[deposit-success] reconcile", {
                  checkout_session_id: sessionId,
                  confirmed: Boolean(reconcileJson.confirmed),
                  booking_request_id: reconcileJson.booking_request_id ?? null,
                });
              }
            } catch {
              // Allow regular polling to continue; this is only a recovery path.
            }
          }
        } catch (err) {
          setViewState("error");
          setError(err instanceof Error ? err.message : "Unable to verify deposit.");
          return;
        }
        const nextAttempt = attempt + 1;
        if (nextAttempt <= MAX_POLLS && !pollingStoppedRef.current) {
          schedule(nextAttempt);
        }
      }, delay);
    };

    schedule(1);

    return () => {
      cancelled = true;
      pollingStoppedRef.current = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [bookingId, nextUrl, pollKey, router]);

  const timedOut = polls >= MAX_POLLS;
  const delayed = polls >= DELAYED_THRESHOLD && !timedOut;
  const exhausted = polls >= MAX_POLLS;
  const showDelayed = viewState === "checking" && delayed;
  const showChecking = viewState === "checking" && !delayed && !timedOut;
  const showTimeout = viewState === "checking" && timedOut;

  useEffect(() => {
    if (viewState !== "checking") return;
    if (timedOut) {
      setViewState("delayed");
      return;
    }
    if (delayed) {
      setViewState("delayed");
    }
  }, [delayed, timedOut, viewState]);

  const runSingleStatusCheck = async () => {
    if (!bookingId) return;
    setError(null);
    try {
      const response = await fetch(`/api/booking/status?id=${encodeURIComponent(bookingId)}`);
      const json = (await response.json()) as BookingStatus & { error?: string };
      if (!response.ok) {
        if (response.status === 401) {
          setViewState("unauthorized");
          return;
        }
        if (response.status === 404) {
          setViewState("notFound");
          return;
        }
        setViewState("error");
        setError(json.error ?? "Unable to verify deposit.");
        return;
      }
      setStatus(json);
      if (isSuccessState(json)) {
        pollingStoppedRef.current = true;
        setViewState("confirmed");
        if (!redirectingRef.current) {
          redirectingRef.current = true;
          router.replace(nextUrl || "/");
        }
        return;
      }
      setViewState("delayed");
    } catch (err) {
      setViewState("error");
      setError(err instanceof Error ? err.message : "Unable to verify deposit.");
    }
  };

  const handleRetry = () => {
    setError(null);
    setStatus(null);
    setPolls(0);
    setViewState("checking");
    reconcileAttemptedRef.current = false;
    setPollKey((prev) => prev + 1);
  };

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Deposit status
          </p>
          <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#0B1B3A] transition-all"
              style={{ width: `${Math.min(100, (polls / MAX_POLLS) * 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0B1B3A]/10 text-[#0B1B3A]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B1B3A]/30 border-t-[#0B1B3A]" />
          </span>
          <h1 className="text-2xl font-semibold text-slate-900">
            {viewState === "confirmed"
              ? "Deposit confirmed"
              : "Finalizing your deposit..."}
          </h1>
        </div>

        {showChecking ? (
          <p className="mt-2 text-sm text-slate-500">
            We are confirming your payment. This usually takes a few seconds.
          </p>
        ) : null}

        {showDelayed ? (
          <div className="mt-3 space-y-2 text-sm text-slate-500">
            <p>We’re confirming your payment. This can take a minute.</p>
          </div>
        ) : null}

        {viewState === "confirmed" ? (
          <p className="mt-3 text-sm text-emerald-700">
            Deposit received. Redirecting you to your requests...
          </p>
        ) : null}

        {viewState === "notFound" ? (
          <div className="mt-3 space-y-2 text-sm text-slate-500">
            <p>We’re still syncing your deposit.</p>
            <p>
              This can take up to a minute. You can safely continue, and we’ll
              update automatically.
            </p>
          </div>
        ) : null}

        {viewState === "unauthorized" ? (
          <div className="mt-3 space-y-2 text-sm text-slate-500">
            <p>Please sign in to confirm your deposit.</p>
            <p>Once signed in, we’ll finish syncing your payment.</p>
          </div>
        ) : null}

        {viewState === "error" && error ? (
          <div className="mt-3 space-y-2 text-sm text-slate-500">
            <p>We couldn’t confirm it yet.</p>
            <p>{error}</p>
          </div>
        ) : null}

        {(showTimeout ||
          viewState === "delayed" ||
          viewState === "error" ||
          viewState === "notFound") ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/requests"
              className="inline-flex items-center rounded-full bg-[#0B1B3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B1B3A]/90"
            >
              Go to requests
            </Link>
            <button
              type="button"
              onClick={exhausted ? runSingleStatusCheck : handleRetry}
              className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {exhausted ? "Check again" : "Try again"}
            </button>
          </div>
        ) : null}

        {viewState === "unauthorized" ? (
          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center rounded-full bg-[#0B1B3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B1B3A]/90"
            >
              Sign in
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
