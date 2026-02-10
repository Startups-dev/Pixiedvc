"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CheckCircle } from "lucide-react";

import { Button } from "@pixiedvc/design-system";

type OwnerMatchActionsProps = {
  matchId: string;
  initialStatus: string;
  expiresAt: string;
  serverNow: string;
  familyLabel?: string | null;
  initialRentalId?: string | null;
};

type UiState = "pending" | "accepting" | "accepted" | "declined" | "error";

type AcceptPayload = { rentalId?: string; error?: string };

function deriveUiState(status: string): UiState {
  if (status === "declined") return "declined";
  if (status === "accepted" || status === "booked") return "accepted";
  return "pending";
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function OwnerMatchActions({
  matchId,
  initialStatus,
  expiresAt,
  serverNow,
  familyLabel,
  initialRentalId,
}: OwnerMatchActionsProps) {
  const router = useRouter();
  const [isSubmitting, setSubmitting] = useState(false);
  const [matchStatus, setMatchStatus] = useState(initialStatus);
  const [uiState, setUiState] = useState<UiState>(deriveUiState(initialStatus));
  const [successVisible, setSuccessVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookingProgressVisible, setBookingProgressVisible] = useState(false);
  const [rentalId, setRentalId] = useState<string | null>(initialRentalId ?? null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [expireRequested, setExpireRequested] = useState(false);

  const isAccepted = useMemo(() => uiState === "accepted", [uiState]);
  const serverOffsetMs = useMemo(() => {
    const serverTime = new Date(serverNow).getTime();
    if (Number.isNaN(serverTime)) return 0;
    return Date.now() - serverTime;
  }, [serverNow]);

  useEffect(() => {
    setUiState(deriveUiState(matchStatus));
  }, [matchStatus]);

  useEffect(() => {
    if (uiState === "accepted") {
      const id = requestAnimationFrame(() => setSuccessVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setSuccessVisible(false);
  }, [uiState]);

  useEffect(() => {
    if (bookingInProgress) {
      const id = requestAnimationFrame(() => setBookingProgressVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setBookingProgressVisible(false);
  }, [bookingInProgress]);

  useEffect(() => {
    const expiresTime = new Date(expiresAt).getTime();
    if (Number.isNaN(expiresTime)) {
      setRemainingMs(null);
      return;
    }

    const updateRemaining = () => {
      const adjustedNow = Date.now() - serverOffsetMs;
      setRemainingMs(Math.max(expiresTime - adjustedNow, 0));
    };

    updateRemaining();
    const id = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, serverOffsetMs]);

  useEffect(() => {
    if (remainingMs === null) return;
    if (remainingMs > 0) return;
    if (expireRequested) return;
    if (uiState !== "pending") return;

    setExpireRequested(true);
    const expireMatch = async () => {
      try {
        await fetch(`/api/owner/matches/${matchId}/expire`, { method: "POST" });
      } finally {
        router.push("/owner/matches");
        router.refresh();
      }
    };
    void expireMatch();
  }, [remainingMs, expireRequested, uiState, matchId, router]);

  const handleAction = async (action: "accept" | "decline") => {
    setSubmitting(true);
    setError(null);
    setBookingInProgress(false);
    try {
      setUiState("accepting");
      const response = await fetch(`/api/owner/matches/${matchId}/${action}`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as AcceptPayload;

      if (response.status === 410 || payload.error === "expired") {
        router.push("/owner/matches");
        router.refresh();
        return;
      }

      if (!response.ok) {
        throw new Error("Something went wrong.");
      }

      if (action === "accept") {
        setMatchStatus("accepted");
        setUiState("accepted");
        setRentalId(payload.rentalId ?? null);
        return;
      }

      setMatchStatus("declined");
      setUiState("declined");
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Owner match action failed", err);
      }
      setError("Something went wrong. Please try again.");
      setUiState("error");
    } finally {
      setSubmitting(false);
    }
  };

  const isLowTime = remainingMs !== null && remainingMs <= 10 * 60 * 1000;

  const familyName = familyLabel ?? "your renter";

  return (
    <div className="space-y-4">
      {uiState === "pending" ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Review booking request</p>
            <p className="text-sm text-slate-600">
              This request is on hold while you decide. Accept to secure the renter.
            </p>
          </div>
          {remainingMs !== null ? (
            <div className="text-sm font-semibold">
              <span className="text-slate-500">Time left to respond: </span>
              <span className={isLowTime ? "text-rose-600" : "text-slate-900"}>
                {formatRemaining(remainingMs)}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleAction("accept")} disabled={isSubmitting}>
              Accept booking request
            </Button>
            <Button onClick={() => handleAction("decline")} variant="ghost" disabled={isSubmitting}>
              Decline
            </Button>
          </div>
          <p className="text-xs text-slate-500">You’ll place the Disney reservation only after accepting.</p>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
      ) : null}

      {uiState === "accepting" ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Updating</p>
          <h3 className="text-lg font-semibold text-ink">Accepting...</h3>
          <p className="text-sm text-slate-600">Please wait while we lock in the request.</p>
          <div className="flex flex-wrap gap-3">
            <Button disabled>Accepting...</Button>
            <Button variant="ghost" disabled>Decline</Button>
          </div>
        </div>
      ) : null}

      {uiState === "error" ? (
        <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-500">Error</p>
          <p>Couldn’t update this match. Please try again.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setUiState("pending")}>Retry</Button>
            <Button variant="ghost" onClick={() => router.push("/owner/matches")}>Back to matches</Button>
          </div>
        </div>
      ) : null}

      {uiState === "declined" ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Declined</p>
          <p>This request will be matched to another owner.</p>
          <Button onClick={() => router.push("/owner/matches")}>Back to matches</Button>
        </div>
      ) : null}

      {isAccepted ? (
        <div
          className={[
            "space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none",
            bookingInProgress ? "opacity-0 -translate-y-2 pointer-events-none" : "opacity-100 translate-y-0",
          ].join(" ")}
        >
          <div
            className={[
              "rounded-xl border border-emerald-200 bg-emerald-50 p-4 transition-all duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none",
              successVisible
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 translate-y-1.5 scale-[0.98]",
            ].join(" ")}
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-600">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
              </span>
              <span>Success</span>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-emerald-900">You’ve secured a renter!</h3>
            <p className="mt-2 text-sm text-emerald-800">These points are now committed to this request.</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-ink">Next step: Book with Disney Vacation Club.</h4>
          </div>

          <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <summary className="cursor-pointer font-semibold text-slate-700">How to book with DVC (phone + website)</summary>
            <div className="mt-3 space-y-2">
              <p>Call (800) 800-9800 (US/Canada)</p>
              <p>(407) 566-3800 (International)</p>
              <p>Official website: disneyvacationclub.disney.go.com</p>
              <p className="text-xs text-slate-500">Tip: Best time to call: starting 8:00 AM ET</p>
            </div>
          </details>

          {rentalId ? (
            <button
              type="button"
              onClick={() => router.push(`/owner/rentals/${rentalId}`)}
              className="text-xs font-semibold text-slate-500 underline underline-offset-4"
            >
              View rental details
            </button>
          ) : null}
        </div>
      ) : null}

      {bookingInProgress ? (
        <div
          className={[
            "rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 transition-all duration-[420ms] ease-out motion-reduce:transition-none motion-reduce:transform-none",
            bookingProgressVisible
              ? "opacity-100 translate-y-0 scale-100"
              : "opacity-0 translate-y-2 scale-[0.98]",
          ].join(" ")}
        >
          <h3 className="text-xl font-semibold text-ink">Booking in progress</h3>
          <p className="mt-2 text-sm text-slate-600">You’ve secured the {familyName} stay.</p>
          <p className="mt-3 text-sm text-slate-600">
            We’ve received the Disney confirmation number and are preparing the next steps.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Next steps:</p>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <p>• The signed rental agreement</p>
            <p>• Your first payout (70% of reservation)</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => router.push(rentalId ? `/owner/rentals/${rentalId}` : "/owner/rentals")}>
              View rental milestones
            </Button>
            <Button variant="ghost" onClick={() => router.push("/owner/dashboard")}>
              Back to dashboard
            </Button>
          </div>
        </div>
      ) : null}

    </div>
  );
}
