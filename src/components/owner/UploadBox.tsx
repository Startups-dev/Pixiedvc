"use client";

import { useState } from "react";

export default function UploadBox({
  rentalId,
  documentType,
  label,
  helper,
  confirmationNumber,
  disabledMessage,
}: {
  rentalId: string;
  documentType: string;
  label: string;
  helper?: string;
  confirmationNumber?: string | null;
  disabledMessage?: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage(null);

    const startResponse = await fetch("/api/rental-docs/start-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        rental_id: rentalId,
        doc_type: documentType,
        mime_type: file.type,
        size_bytes: file.size,
      }),
    });

    if (!startResponse.ok) {
      setMessage("Upload failed. Please try again.");
      setLoading(false);
      return;
    }

    const startPayload = (await startResponse.json()) as { signed_url: string; object_path: string };
    const uploadResponse = await fetch(startPayload.signed_url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "false",
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      setMessage("Upload failed. Please try again.");
      setLoading(false);
      return;
    }

    const finalizeResponse = await fetch("/api/rental-docs/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rental_id: rentalId,
        object_path: startPayload.object_path,
        original_name: file.name,
        doc_type: documentType,
        size_bytes: file.size,
      }),
    });

    if (!finalizeResponse.ok) {
      setMessage("We saved the file, but could not record it. Please contact concierge.");
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/owner/rentals/${rentalId}/confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmation_number: confirmationNumber ?? null,
      }),
    });

    if (!response.ok) {
      setMessage("Document uploaded, but confirmation could not be processed.");
      setLoading(false);
      return;
    }

    setMessage("Document uploaded.");
    setLoading(false);
    setFile(null);
    window.location.reload();
  };

  const uploadDisabled = !confirmationNumber;

  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-ink">{label}</p>
      {helper ? <p className="text-xs text-muted">{helper}</p> : null}
      <input
        type="file"
        accept="application/pdf,image/*"
        className="mt-3 text-xs text-muted"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || loading || uploadDisabled}
        className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Upload"}
      </button>
      {uploadDisabled && disabledMessage ? (
        <p className="mt-2 text-xs text-slate-500">{disabledMessage}</p>
      ) : null}
      {message ? <p className="mt-2 text-xs text-emerald-700">{message}</p> : null}
    </div>
  );
}
