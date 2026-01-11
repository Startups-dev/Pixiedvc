import CopyButton from './CopyButton';

export default function AdminMatchHeader({
  matchId,
  invalidMatch,
  hasRental,
}: {
  matchId: string;
  invalidMatch: boolean;
  hasRental: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin · Matching</p>
        <h1 className="text-3xl font-semibold text-slate-900">Match detail</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
          <span>Match ID: {matchId}</span>
          <CopyButton value={matchId} />
        </div>
      </div>

      {invalidMatch ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <p className="font-semibold">Booking cancelled</p>
          <p>This match is now invalid. Use Expire or Delete to clean it up.</p>
        </div>
      ) : null}

      {hasRental ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Rental exists — cannot modify match here.
        </div>
      ) : null}
    </div>
  );
}
