type MatchListTileRow = {
  row_id: string;
  kind: 'match' | 'unmatched_guest' | 'unmatched_owner';
  match: {
    id: string | null;
    status: string | null;
    created_at: string | null;
  } | null;
  booking: {
    id: string | null;
    status: string | null;
    check_in: string | null;
    lead_guest_name: string | null;
    lead_guest_email?: string | null;
  } | null;
  owner: {
    id: string | null;
    display_name: string | null;
    email?: string | null;
  } | null;
  rental: {
    status: string | null;
  } | null;
  flags: {
    payoutStatus: 'none' | 'pending' | 'released';
  };
};

function getSpineColor(row: MatchListTileRow) {
  const bookingStatus = row.booking?.status ?? null;
  const matchStatus = row.match?.status ?? null;
  const rentalStatus = row.rental?.status ?? null;

  if (bookingStatus === 'cancelled') return 'bg-rose-500';
  if (matchStatus === 'expired') return 'bg-amber-500';
  if (matchStatus === 'pending_owner') return 'bg-sky-500';
  if (rentalStatus === 'confirmed') return 'bg-emerald-500';
  return 'bg-slate-300';
}

function getRibbonLabel(row: MatchListTileRow) {
  const bookingStatus = row.booking?.status ?? null;
  if (bookingStatus === 'cancelled' || bookingStatus === 'flagged') {
    return bookingStatus.toUpperCase();
  }
  return (row.match?.status ?? 'UNASSIGNED').toUpperCase();
}

export default function MatchListTile({
  row,
  isSelected,
  onSelect,
}: {
  row: MatchListTileRow;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const guestName = row.booking?.lead_guest_name?.trim() || 'No Guest';
  const guestEmail = row.booking?.lead_guest_email?.trim() || '';
  const ownerName = row.owner?.display_name?.trim() || 'Unassigned';
  const ownerEmail = row.owner?.email?.trim() || '';
  const isGuestMissing = !row.booking?.lead_guest_name;
  const isOwnerMissing = !row.owner?.display_name;
  const spineColor = getSpineColor(row);
  const ribbonLabel = getRibbonLabel(row);
  const showPaid = row.flags.payoutStatus === 'released';
  const isCancelled = row.booking?.status === 'cancelled';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${
        isSelected
          ? 'border-l-4 border-l-blue-600 bg-blue-50'
          : 'border-transparent bg-white hover:border-slate-200'
      }`}
    >
      <div
        className={`flex flex-1 flex-col gap-1 rounded-xl p-2 ${
          isGuestMissing ? 'border border-dashed border-slate-200 text-slate-400' : 'text-slate-700'
        }`}
      >
        <p className="text-sm font-semibold">{guestName}</p>
        {guestEmail ? <p className="text-xs text-slate-500">{guestEmail}</p> : null}
      </div>

      <div className="relative flex h-10 w-32 items-center justify-between">
        <span className={`absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full ${spineColor}`} />
        <span className={`relative z-10 h-2 w-2 rounded-full ${spineColor}`} />
        <span className={`relative z-10 h-2 w-2 rounded-full ${spineColor}`} />
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
            isCancelled
              ? 'bg-rose-100 text-rose-700'
              : 'border border-slate-200 text-slate-500'
          }`}
        >
          {ribbonLabel}
        </div>
      </div>

      <div
        className={`flex flex-col gap-1 rounded-xl p-2 text-right ${
          isOwnerMissing ? 'border border-dashed border-slate-200 text-slate-400' : 'text-slate-700'
        }`}
      >
        <div className="flex items-center justify-end gap-2">
          <p className="text-sm font-semibold">{ownerName}</p>
          {showPaid ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Paid
            </span>
          ) : null}
        </div>
        {ownerEmail ? <p className="text-xs text-slate-500">{ownerEmail}</p> : null}
      </div>
    </button>
  );
}

export type { MatchListTileRow };
