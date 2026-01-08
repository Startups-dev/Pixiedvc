import Link from "next/link";

import { Card } from "@pixiedvc/design-system";
import type { RentalDocumentRow } from "@/lib/owner-data";

const typeLabels: Record<string, string> = {
  agreement_pdf: "Agreement",
  disney_confirmation_email: "Disney confirmation",
  invoice: "Invoice",
  booking_package: "Booking package",
  other: "Other document",
};

export default function DocumentList({ documents }: { documents: RentalDocumentRow[] }) {
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Documents</p>
        <h2 className="text-xl font-semibold text-ink">Booking files</h2>
      </div>
      {documents.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3">
              <div>
                <p className="font-semibold text-ink">{typeLabels[doc.type] ?? doc.type}</p>
                <p className="text-xs text-muted">Uploaded {new Date(doc.created_at).toLocaleDateString()}</p>
              </div>
              {doc.signed_url ? (
                <Link
                  href={doc.signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  View
                </Link>
              ) : (
                <span className="text-xs text-muted">Link unavailable</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
