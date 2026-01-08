"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase";

export default function UploadBox({
  rentalId,
  documentType,
  label,
  helper,
}: {
  rentalId: string;
  documentType: string;
  label: string;
  helper?: string;
}) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage(null);

    const filename = `${crypto.randomUUID?.() ?? Date.now()}-${file.name}`;
    const path = `rentals/${rentalId}/${documentType}/${filename}`;

    const { error: uploadError } = await supabase
      .storage
      .from("rental-docs")
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      setMessage("Upload failed. Please try again.");
      setLoading(false);
      return;
    }

    const response = await fetch(`/api/owner/rentals/${rentalId}/confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storage_path: path, original_name: file.name, type: documentType }),
    });

    if (!response.ok) {
      setMessage("We saved the file, but could not record it. Please contact concierge.");
      setLoading(false);
      return;
    }

    setMessage("Document uploaded.");
    setLoading(false);
    setFile(null);
    window.location.reload();
  };

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
        disabled={!file || loading}
        className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Upload"}
      </button>
      {message ? <p className="mt-2 text-xs text-emerald-700">{message}</p> : null}
    </div>
  );
}
