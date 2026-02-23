"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { confirmReadyStayTransferInline } from "./actions";

type PendingTransferRow = {
  id: string;
  bookingId: string;
  resortName: string;
  checkIn: string | null;
  checkOut: string | null;
  points: number | null;
  guestName: string | null;
};

type BannerState = {
  type: "success" | "error";
  title: string;
  message: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function PendingTransfersCard({
  initialRows,
}: {
  initialRows: PendingTransferRow[];
}) {
  const [completedRowIds, setCompletedRowIds] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [submittingRowId, setSubmittingRowId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasPendingRows = useMemo(
    () => initialRows.some((row) => !completedRowIds.has(row.id)),
    [initialRows, completedRowIds],
  );

  useEffect(() => {
    if (!banner) return;
    const handle = window.setTimeout(() => {
      setBanner(null);
    }, 8000);
    return () => window.clearTimeout(handle);
  }, [banner]);

  const handleConfirm = (row: PendingTransferRow) => {
    setSubmittingRowId(row.id);
    startTransition(async () => {
      const result = await confirmReadyStayTransferInline({
        readyStayId: row.id,
        bookingId: row.bookingId,
      });

      if (result.ok) {
        setCompletedRowIds((prev) => {
          const next = new Set(prev);
          next.add(row.id);
          return next;
        });
        setBanner({
          type: "success",
          title: "Transfer complete",
          message:
            "You've finished the Disney transfer. The guest can now link the reservation in My Disney Experience. We've notified them.",
        });
      } else {
        setBanner({
          type: "error",
          title: "Couldn't complete transfer",
          message:
            result.error?.trim() ||
            "Please try again. If the issue persists, contact support.",
        });
      }

      setSubmittingRowId(null);
    });
  };

  return (
    <>
      {banner ? (
        <div
          className={
            banner.type === "success"
              ? "rounded-xl border border-green-200 bg-green-50 px-4 py-3"
              : "rounded-xl border border-red-200 bg-red-50 px-4 py-3"
          }
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900">{banner.title}</p>
              <p className="text-sm text-slate-600">{banner.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="text-xs font-semibold text-slate-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {!hasPendingRows ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
          No transfers in progress.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <th className="px-4 py-3 font-semibold">Resort</th>
                <th className="px-4 py-3 font-semibold">Dates</th>
                <th className="px-4 py-3 font-semibold">Points</th>
                <th className="px-4 py-3 font-semibold">Guest</th>
                <th className="px-4 py-3 font-semibold">Transfer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {initialRows.map((row) => {
                const isCompleted = completedRowIds.has(row.id);
                const isSubmittingThisRow = submittingRowId === row.id && isPending;

                return (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-ink">{row.resortName || "Listing"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(row.checkIn)} - {formatDate(row.checkOut)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.points ?? 0}</td>
                    <td className="px-4 py-3 text-slate-600">{row.guestName ?? "—"}</td>
                    <td className="px-4 py-3">
                      {isCompleted ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                          Transfer confirmed
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(submittingRowId) || isPending}
                          onClick={() => handleConfirm(row)}
                          className="inline-flex h-9 items-center justify-center rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSubmittingThisRow ? "Completing..." : "Confirm transfer complete"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
