import CopyButton from './CopyButton';
import AdminMatchExpireButton from './AdminMatchExpireButton';
import AdminMatchDeleteButton from './AdminMatchDeleteButton';

function renderField(
  label: string,
  value: string | number | null | undefined,
  copyValue?: string | null,
) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-2 font-medium text-slate-900">
        <span>{value ?? '—'}</span>
        {copyValue ? <CopyButton value={copyValue} /> : null}
      </span>
    </div>
  );
}

export default function AdminMatchTiles({
  booking,
  match,
  owner,
  canExpire,
  canDelete,
}: {
  booking: {
    id: string;
    status: string | null;
    check_in: string | null;
    check_out: string | null;
    total_points: number | null;
    primary_resort_id: string | null;
    lead_guest_email: string | null;
    lead_guest_name: string | null;
    phone: string | null;
  } | null;
  match: {
    id: string;
    status: string | null;
    created_at: string | null;
    expires_at: string | null;
    responded_at: string | null;
    points_reserved: number | null;
    owner_membership_id: string | number | null;
    owner_id: string | null;
  } | null;
  owner: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
  canExpire: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Booking</p>
        <div className="mt-3 space-y-2">
          {renderField('Booking ID', booking?.id ?? null, booking?.id ?? null)}
          {renderField('Status', booking?.status ?? null)}
          {renderField('Check-in', booking?.check_in ?? null)}
          {renderField('Check-out', booking?.check_out ?? null)}
          {renderField('Total points', booking?.total_points ?? null)}
          {renderField('Primary resort', booking?.primary_resort_id ?? null)}
          {renderField('Lead guest', booking?.lead_guest_name ?? null)}
          {renderField('Guest email', booking?.lead_guest_email ?? null)}
          {renderField('Phone', booking?.phone ?? null)}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Match</p>
        <div className="mt-3 space-y-2">
          {renderField('Match ID', match?.id ?? null, match?.id ?? null)}
          {renderField('Status', match?.status ?? null)}
          {renderField('Points reserved', match?.points_reserved ?? null)}
          {renderField('Matched at', match?.created_at ?? null)}
          {renderField('Expires at', match?.expires_at ?? null)}
          {renderField('Responded at', match?.responded_at ?? null)}
          {renderField('Owner ID', match?.owner_id ?? null, match?.owner_id ?? null)}
          {renderField('Owner membership', match?.owner_membership_id ?? null)}
        </div>
        <div className="mt-4 space-y-3">
          <AdminMatchExpireButton matchId={match?.id ?? ''} canExpire={canExpire} />
          <AdminMatchDeleteButton matchId={match?.id ?? ''} disabled={!canDelete} />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner</p>
        <div className="mt-3 space-y-2">
          {renderField('Owner ID', owner?.id ?? null, owner?.id ?? null)}
          {renderField('Name', owner?.display_name ?? null)}
          {renderField('Email', owner?.email ?? null)}
        </div>
      </div>
    </div>
  );
}
