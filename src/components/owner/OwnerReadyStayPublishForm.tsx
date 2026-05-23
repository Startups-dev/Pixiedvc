"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@pixiedvc/design-system";
import { getReadyStayPricingBand, getReadyStaySeason } from "@/lib/ready-stays/pricing";
import { getMaxOwnerPayout, getStayGuestPriceCap } from "@/lib/ready-stays/ownerPricing";

type ReadyStayRental = {
  id: string;
  resort_id: string | null;
  resort_name: string | null;
  check_in: string;
  check_out: string;
  points_required: number;
  room_type: string | null;
};

type OwnerReadyStayPublishFormProps = {
  rental: ReadyStayRental;
  confirmationReady: boolean;
  hasExistingReservationProof: boolean;
};


function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function seasonLabel(season: ReturnType<typeof getReadyStaySeason>) {
  switch (season) {
    case "christmas":
      return "Christmas";
    case "halloween":
      return "Halloween";
    case "marathon":
      return "Marathon";
    case "spring_break":
      return "Spring Break";
    case "high":
      return "High Season";
    default:
      return "Normal Season";
  }
}

function getReservationProofMimeType(file: File) {
  const normalizedType = file.type.toLowerCase();
  if (normalizedType === "application/pdf" || normalizedType === "image/jpeg" || normalizedType === "image/png") {
    return normalizedType;
  }

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  return null;
}

export default function OwnerReadyStayPublishForm({
  rental,
  confirmationReady,
  hasExistingReservationProof,
}: OwnerReadyStayPublishFormProps) {
  const router = useRouter();
  const band = useMemo(
    () => getReadyStayPricingBand({ resort_id: rental.resort_id, check_in: rental.check_in }),
    [rental.check_in, rental.resort_id],
  );
  const stayCap = useMemo(
    () => getStayGuestPriceCap({ checkIn: rental.check_in, checkOut: rental.check_out }),
    [rental.check_in, rental.check_out],
  );
  const maxOwnerCents = useMemo(
    () => Math.round(getMaxOwnerPayout({ checkIn: rental.check_in, checkOut: rental.check_out }) * 100),
    [rental.check_in, rental.check_out],
  );
  const minOwnerCents = Math.min(band.minOwnerCents, maxOwnerCents);
  const season = getReadyStaySeason(rental.check_in);
  const [ownerPrice, setOwnerPrice] = useState(Math.min(band.suggestedOwnerCents, maxOwnerCents));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  const estimatedOwnerPayout = ownerPrice * rental.points_required;

  const uploadReservationProof = async () => {
    if (!proofFile) return;

    const mimeType = getReservationProofMimeType(proofFile);
    if (!mimeType) {
      throw new Error("Reservation proof must be a JPG, JPEG, PNG, or PDF file.");
    }

    const startResponse = await fetch("/api/rental-docs/start-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        rental_id: rental.id,
        doc_type: "disney_confirmation_email",
        mime_type: mimeType,
        size_bytes: proofFile.size,
      }),
    });

    if (!startResponse.ok) {
      const payload = (await startResponse.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Unable to start the reservation proof upload.");
    }

    const startPayload = (await startResponse.json()) as { signed_url: string; object_path: string };
    const uploadResponse = await fetch(startPayload.signed_url, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "x-upsert": "false",
      },
      body: proofFile,
    });

    if (!uploadResponse.ok) {
      throw new Error("Unable to upload the reservation proof.");
    }

    const finalizeResponse = await fetch("/api/rental-docs/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rental_id: rental.id,
        object_path: startPayload.object_path,
        original_name: proofFile.name,
        doc_type: "disney_confirmation_email",
        size_bytes: proofFile.size,
      }),
    });

    if (!finalizeResponse.ok) {
      throw new Error("We uploaded the reservation proof, but could not save it.");
    }
  };

  const handlePublish = async () => {
    setError(null);
    if (!confirmationReady) {
      setError("Upload the Disney confirmation before listing.");
      return;
    }
    if (!hasExistingReservationProof && !proofFile) {
      setError("Upload reservation proof before listing this Ready Stay.");
      return;
    }

    setSubmitting(true);
    try {
      if (!hasExistingReservationProof) {
        await uploadReservationProof();
      }

      const response = await fetch("/api/owner/ready-stays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rental_id: rental.id,
          owner_price_per_point_cents: ownerPrice,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        id?: string | null;
        alreadyListed?: boolean;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to list a Ready Stay.");
      }
      if (payload.alreadyListed) {
        if (payload.id) {
          router.push(`/owner/ready-stays/${payload.id}`);
        } else {
          router.push("/owner/ready-stays?notice=already-listed");
        }
        router.refresh();
        return;
      }
      if (payload.id) {
        router.push(`/owner/ready-stays/${payload.id}`);
      } else {
        router.push("/owner/ready-stays");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to list a Ready Stay.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Pricing band</p>
        <h2 className="text-xl font-semibold text-ink">List a Ready Stay</h2>
        <p className="text-sm font-semibold text-amber-600">Season: {seasonLabel(season)}</p>
        <p className="text-xs text-slate-500">
          Pricing caps are market ceilings that protect brand trust while keeping listings competitive.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Cap</p>
          <p className="mt-2 text-lg font-semibold text-ink">{formatDollars(stayCap.capDollars * 100)}/pt</p>
          <p className="text-xs text-slate-500">Market ceiling</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Suggested</p>
          <p className="mt-2 text-lg font-semibold text-ink">{formatDollars(band.suggestedOwnerCents)}/pt</p>
          <p className="text-xs text-slate-500">Owner price per point</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estimated payout</p>
          <p className="mt-2 text-lg font-semibold text-ink">{formatDollars(estimatedOwnerPayout)}</p>
          <p className="text-xs text-slate-500">Based on your selected payout</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <label className="text-sm font-semibold text-slate-700">
          Owner price per point: {formatDollars(ownerPrice)} /pt
        </label>
        <input
          type="range"
          min={minOwnerCents}
          max={maxOwnerCents}
          step={100}
          value={ownerPrice}
          onChange={(event) => setOwnerPrice(Number(event.target.value))}
          className="w-full accent-[#0B1B3A]"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>Min {formatDollars(minOwnerCents)}/pt</span>
          <span>Max {formatDollars(maxOwnerCents)}/pt</span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reservation proof</p>
        <div className="mt-2 space-y-3">
          <p className="text-sm font-semibold text-ink">Reservation proof</p>
          <p className="text-xs text-slate-500">
            Upload a screenshot, PDF, or photo of your Disney confirmation email showing this reservation is already secured.
          </p>
          {hasExistingReservationProof ? (
            <p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              Reservation proof already on file.
            </p>
          ) : (
            <>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                className="text-xs text-muted"
                onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
              />
              <p className="text-[11px] text-slate-500">Accepted file types: JPG, JPEG, PNG, PDF.</p>
            </>
          )}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={handlePublish} disabled={submitting || !confirmationReady}>
          {submitting ? "Submitting..." : "Submit Ready Stay"}
        </Button>
        {!confirmationReady ? (
          <p className="text-xs text-slate-500">
            Upload the Disney confirmation before listing.
          </p>
        ) : null}
      </div>
    </div>
  );
}
