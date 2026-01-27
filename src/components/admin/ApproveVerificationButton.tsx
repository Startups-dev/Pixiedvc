"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ApproveVerificationButtonProps = {
  ownerId: string;
};

export default function ApproveVerificationButton({ ownerId }: ApproveVerificationButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/owners/verifications/${ownerId}/approve`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const message = `Approve failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`;
        setError(message);
        console.error("[ADMIN_APPROVE]", res.status, res.statusText, text);
        return;
      }

      router.refresh();
    } catch (err: any) {
      const message = `Approve failed: ${err?.message ?? "unknown error"}`;
      setError(message);
      console.error("[ADMIN_APPROVE]", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        disabled={loading}
        onClick={handleApprove}
      >
        {loading ? "Approving…" : "Approve"}
      </button>
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}
