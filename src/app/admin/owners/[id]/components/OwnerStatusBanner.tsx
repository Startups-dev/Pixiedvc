const STATUS_STYLES: Record<string, { badge: string; description: string }> = {
  verified: {
    badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    description: 'This owner has been verified and can receive contracts.',
  },
  pending: {
    badge: 'bg-amber-50 text-amber-800 border border-amber-200',
    description: 'Waiting on concierge to complete verification.',
  },
  needs_more_info: {
    badge: 'bg-sky-50 text-sky-800 border border-sky-200',
    description: 'Owner must supply additional documentation.',
  },
  rejected: {
    badge: 'bg-rose-50 text-rose-800 border border-rose-200',
    description: 'Owner has been rejected. Review the notes below.',
  },
};

export default function OwnerStatusBanner({ status, rejectionReason }: { status: string | null; rejectionReason?: string | null }) {
  const key = status ?? 'pending';
  const tone = STATUS_STYLES[key] ?? STATUS_STYLES.pending;

  return (
    <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${tone.badge}`}>
      <p className="text-base font-semibold capitalize">{status ?? 'pending'}</p>
      <p className="mt-1 text-xs text-slate-700">{tone.description}</p>
      {status === 'rejected' && rejectionReason ? (
        <p className="mt-1 text-xs text-rose-700">Reason: {rejectionReason}</p>
      ) : null}
    </div>
  );
}
