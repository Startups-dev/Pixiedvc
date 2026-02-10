import Link from 'next/link';
import type { ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import QuickLinksPanel from './QuickLinksPanel';

export const dynamic = 'force-dynamic';

type AdminClient = SupabaseClient;

const REQUEST_STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'matched', label: 'Matched' },
  { value: 'contract_sent', label: 'Contract sent' },
  { value: 'contract_signed', label: 'Contract signed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
];

const OWNER_VERIFICATION_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
];

const PAGE_SIZE = 20;
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

type AdminPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AdminHome({ searchParams }: AdminPageProps) {
  const { supabase: sessionClient } = await requireAdminUser('/admin');
  const supabaseAdmin = getSupabaseAdminClient();
  const supabase: AdminClient = supabaseAdmin ?? sessionClient;
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  const requestStatusParam = getParam(searchParams, 'requestStatus') ?? 'all';
  const requestStatusFilter = normalizeStatus(requestStatusParam, REQUEST_STATUS_OPTIONS);
  const requestPageQueryParam = getParam(searchParams, 'requestPage');
  const requestPageParam = parsePageParam(requestPageQueryParam);
  const requestQueryValue = getParam(searchParams, 'requestQuery');
  const requestQueryParam = requestQueryValue?.trim() ? requestQueryValue.trim() : undefined;

  const ownerVerificationParam = getParam(searchParams, 'ownerVerification') ?? 'all';
  const ownerVerificationFilter = normalizeStatus(ownerVerificationParam, OWNER_VERIFICATION_OPTIONS);
  const ownerPageQueryParam = getParam(searchParams, 'ownerPage');
  const ownerPageParam = parsePageParam(ownerPageQueryParam);
  const ownerQueryValue = getParam(searchParams, 'ownerQuery');
  const ownerQueryParam = ownerQueryValue?.trim() ? ownerQueryValue.trim() : undefined;

  const bookingFilters = {
    status: requestStatusFilter,
    page: requestPageParam,
    query: requestQueryParam,
  };

  const ownerFilters = {
    verification: ownerVerificationFilter,
    page: ownerPageParam,
    query: ownerQueryParam,
  };

  const metricsClient = supabaseAdmin ?? supabase;

  const [requestSummary, ownerSummary, latestRequests, ownerPipelineTable, compliance] = await Promise.all([
    fetchRequestSummary(metricsClient),
    fetchOwnerSummary(metricsClient),
    fetchLatestBookingRequests(metricsClient, bookingFilters),
    fetchOwnerPipelineTable(metricsClient, ownerFilters),
    fetchComplianceSnapshot(metricsClient),
  ]);

  const bookingRows = latestRequests.rows;
  const bookingTotal = latestRequests.total;
  const bookingPage = latestRequests.page;
  const bookingPageSize = latestRequests.pageSize;
  const bookingStart = bookingTotal === 0 ? 0 : (bookingPage - 1) * bookingPageSize + 1;
  const bookingEnd = bookingTotal === 0 ? 0 : Math.min(bookingTotal, bookingPage * bookingPageSize);

  const ownerRows = ownerPipelineTable.rows;
  const ownerTotal = ownerPipelineTable.total;
  const ownerPage = ownerPipelineTable.page;
  const ownerPageSize = ownerPipelineTable.pageSize;
  const ownerStart = ownerTotal === 0 ? 0 : (ownerPage - 1) * ownerPageSize + 1;
  const ownerEnd = ownerTotal === 0 ? 0 : Math.min(ownerTotal, ownerPage * ownerPageSize);

  const currentSearchParams = normalizeSearchParams(searchParams);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h1 className="text-3xl font-semibold text-slate-900">Control Center</h1>
        <p className="text-slate-600">
          Monitor onboarding, requests, and compliance before drilling into the dedicated workspaces.
        </p>
        <div className="text-xs text-slate-500">Live data · refreshed whenever you load this page</div>
      </header>

      <QuickLinksPanel />

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title="Guest Funnel"
          value={requestSummary.totalBookingRequests}
          subtitle={`${requestSummary.newRequestsLast7Days} new in the last 7 days`}
          footer={`${requestSummary.activeRequestsCount} active · ${requestSummary.completedRequestsCount} completed`}
        />
        <SummaryCard
          title="Owner Pipeline"
          value={ownerSummary.verifiedOwnersCount}
          subtitle={`${ownerSummary.pendingOwnersCount} awaiting verification`}
          footer={`${ownerSummary.verifiedOwnersWithInventoryCount} verified w/ inventory`}
        />
        <SummaryCard
          title="Matching Snapshot"
          value={requestSummary.openSubmittedRequestsCount}
          subtitle="Open submitted requests"
          footer={`${requestSummary.matchedInProgressCount} matched in progress`}
        />
      </section>

      <section className="space-y-6">
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Guest Booking Requests</h2>
            <Link href="/admin/guests" className="text-sm font-semibold text-indigo-600 hover:underline">
              View guest workspace →
            </Link>
          </div>
          <form className="mb-3 flex flex-wrap items-center gap-3 text-sm" method="get">
            <input type="hidden" name="requestPage" value="1" />
            <HiddenInput name="ownerVerification" value={ownerVerificationParam !== 'all' ? ownerVerificationParam : undefined} />
            <HiddenInput name="ownerQuery" value={ownerQueryParam} />
            <HiddenInput name="ownerPage" value={ownerPageQueryParam} />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
              <select
                name="requestStatus"
                defaultValue={requestStatusParam}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {REQUEST_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-1 items-center gap-2 min-w-[220px]">
              <input
                type="text"
                name="requestQuery"
                defaultValue={requestQueryValue ?? ''}
                placeholder="Search guest name or email"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                Apply
              </button>
            </div>
          </form>
          {bookingRows.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No booking requests yet. Once a guest completes the Stay Builder, their request will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Guest</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Resort / Room</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookingRows.map((request) => (
                    <tr key={request.id} className="text-slate-700">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{request.guestName ?? request.guestEmail ?? 'Unknown guest'}</div>
                        <div className="text-xs text-slate-500">{request.guestEmail ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDateRange(request.checkIn, request.checkOut)}</td>
                      <td className="px-4 py-3">
                        <div>{request.resortName ?? 'Any resort'}</div>
                        <div className="text-xs text-slate-500">{request.roomLabel ?? 'Room TBD'}</div>
                      </td>
                      <td className="px-4 py-3">{request.pointsRequested ? `${request.pointsRequested.toLocaleString()} pts` : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(request.status)}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{request.createdAt ? dateFormatter.format(new Date(request.createdAt)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <p>
              {bookingTotal === 0
                ? 'Showing 0 of 0 requests'
                : `Showing ${bookingStart}–${bookingEnd} of ${bookingTotal} requests`}
            </p>
            <div className="inline-flex items-center gap-2">
              <PaginationLink
                disabled={bookingPage <= 1 || bookingTotal === 0}
                href={buildAdminHref(currentSearchParams, { requestPage: bookingPage - 1 })}
              >
                Previous
              </PaginationLink>
              <PaginationLink
                disabled={bookingEnd >= bookingTotal}
                href={buildAdminHref(currentSearchParams, { requestPage: bookingPage + 1 })}
              >
                Next
              </PaginationLink>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Owner Verification & Pipeline</h2>
            <Link href="/admin/owners" className="text-sm font-semibold text-indigo-600 hover:underline">
              Review owners →
            </Link>
          </div>
          <form className="mb-3 flex flex-wrap items-center gap-3 text-sm" method="get">
            <input type="hidden" name="ownerPage" value="1" />
            <HiddenInput name="requestStatus" value={requestStatusParam !== 'all' ? requestStatusParam : undefined} />
            <HiddenInput name="requestQuery" value={requestQueryValue} />
            <HiddenInput name="requestPage" value={requestPageQueryParam} />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
              <select
                name="ownerVerification"
                defaultValue={ownerVerificationParam}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {OWNER_VERIFICATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-1 items-center gap-2 min-w-[220px]">
              <input
                type="text"
                name="ownerQuery"
                defaultValue={ownerQueryValue ?? ''}
                placeholder="Search owner name or email"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                Apply
              </button>
            </div>
          </form>
          {ownerRows.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No owners in the pipeline yet. When someone completes owner onboarding, they’ll show up here for review.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Home resort / Use year</th>
                    <th className="px-4 py-3">Points</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ownerRows.map((owner) => (
                    <tr key={owner.id} className="text-slate-700">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{owner.displayName ?? 'Unnamed owner'}</div>
                        <div className="text-xs text-slate-500">{owner.email ?? 'No email'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{owner.primaryResort ?? 'Resort TBD'}</div>
                        <div className="text-xs text-slate-500">Use year {owner.useYear ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{owner.pointsOwned ? `${owner.pointsOwned.toLocaleString()} owned` : '—'}</div>
                        <div className="text-xs text-slate-500">{owner.pointsAvailable ? `${owner.pointsAvailable.toLocaleString()} available` : '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ownerVerificationBadgeClass(owner.verification)}`}>
                          {owner.verification ?? 'unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{owner.createdAt ? dateFormatter.format(new Date(owner.createdAt)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <p>{ownerTotal === 0 ? 'Showing 0 of 0 owners' : `Showing ${ownerStart}–${ownerEnd} of ${ownerTotal} owners`}</p>
            <div className="inline-flex items-center gap-2">
              <PaginationLink
                disabled={ownerPage <= 1 || ownerTotal === 0}
                href={buildAdminHref(currentSearchParams, { ownerPage: ownerPage - 1 })}
              >
                Previous
              </PaginationLink>
              <PaginationLink
                disabled={ownerEnd >= ownerTotal}
                href={buildAdminHref(currentSearchParams, { ownerPage: ownerPage + 1 })}
              >
                Next
              </PaginationLink>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Document coverage</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{compliance.coveragePct}% owners</h2>
          <p className="text-sm text-slate-600">{compliance.ownersWithDocs} owners have uploaded verification docs.</p>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(compliance.coveragePct, 100)}%` }} />
          </div>
          <p className="mt-3 text-xs text-slate-500">{compliance.documentsTotal} files stored · {compliance.ownersWithoutDocs} owners still need uploads</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">SOC readiness</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>• Track admin actions via owner_verification_events (complete)</li>
            <li>• Add login audit export (todo)</li>
            <li>• Automate quarterly document review (todo)</li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">Add the missing tasks above to satisfy SOC change-management requirements.</p>
        </div>
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-slate-600">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Trips & rentals</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-800">Next data set</h2>
          <p className="text-sm">
            Hook up the future trips/rentals ledger to surface past stays, payout totals, and guest satisfaction here. Once the schema exists,
            we can wire it into this card and the owner profiles.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Workspaces</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Link
            href="/admin/owners"
            className="rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-50"
          >
            Owner verification queue →
          </Link>
          <Link
            href="/admin/guests"
            className="rounded-2xl border border-dashed border-slate-300 px-5 py-4 text-sm font-semibold text-slate-500"
          >
            Guest concierge (coming soon)
          </Link>
        </div>
      </section>

      <div className="text-xs text-slate-400">Admin user id: {user?.id ?? '—'}</div>
    </div>
  );
}

type OwnerDocumentRow = {
  owner_id: string | null;
};

type BookingRequestRow = {
  id: string;
  lead_guest_name: string | null;
  lead_guest_email: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string;
  created_at: string | null;
  primary_room: string | null;
  total_points: number | null;
  primary_resort: { name: string | null } | null;
};

type OwnerRow = {
  id: string;
  verification: string | null;
  created_at: string | null;
  profiles: {
    display_name: string | null;
    email: string | null;
  } | null;
  owner_memberships: {
    points_owned: number | null;
    points_available: number | null;
    use_year: string | null;
    resort: { name: string | null } | null;
  }[] | null;
};

type BookingRequestFilters = {
  status?: string;
  page?: number;
  query?: string;
};

type OwnerPipelineFilters = {
  verification?: string;
  page?: number;
  query?: string;
};

type PaginatedResult<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

function SummaryCard({ title, value, subtitle, footer }: { title: string; value: number; subtitle: string; footer: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      <p className="mt-1 text-xs text-slate-400">{footer}</p>
    </div>
  );
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'submitted':
      return 'bg-blue-100 text-blue-700';
    case 'matched':
      return 'bg-indigo-100 text-indigo-700';
    case 'contract_sent':
      return 'bg-amber-100 text-amber-800';
    case 'contract_signed':
      return 'bg-emerald-100 text-emerald-700';
    case 'cancelled':
    case 'expired':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function ownerVerificationBadgeClass(status: string | null) {
  switch (status) {
    case 'verified':
      return 'bg-emerald-100 text-emerald-700';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'rejected':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function formatDateRange(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn && !checkOut) {
    return 'Flexible dates';
  }
  if (checkIn && checkOut) {
    return `${dateFormatter.format(new Date(checkIn))} → ${dateFormatter.format(new Date(checkOut))}`;
  }
  if (checkIn) {
    return dateFormatter.format(new Date(checkIn));
  }
  return checkOut ? dateFormatter.format(new Date(checkOut)) : 'Flexible dates';
}

async function fetchRequestSummary(supabase: AdminClient) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const ACTIVE_STATUSES = ['submitted', 'matched', 'contract_sent', 'contract_signed'];
  const COMPLETED_STATUSES = ['contract_signed'];
  const MATCHED_STATUSES = ['matched', 'contract_sent', 'contract_signed'];

  const [totalBookingRequests, newRequestsLast7Days, activeRequestsCount, completedRequestsCount, openSubmittedRequestsCount, matchedInProgressCount] =
    await Promise.all([
      countBookingRequests(supabase),
      countBookingRequests(supabase, (query) => query.gte('created_at', sevenDaysAgo)),
      countBookingRequests(supabase, (query) => query.in('status', ACTIVE_STATUSES)),
      countBookingRequests(supabase, (query) => query.in('status', COMPLETED_STATUSES)),
      countBookingRequests(supabase, (query) => query.eq('status', 'submitted')),
      countBookingRequests(supabase, (query) => query.in('status', MATCHED_STATUSES)),
    ]);

  return {
    totalBookingRequests,
    newRequestsLast7Days,
    activeRequestsCount,
    completedRequestsCount,
    openSubmittedRequestsCount,
    matchedInProgressCount,
  };
}

async function countBookingRequests(
  supabase: AdminClient,
  applyFilter?: (query: ReturnType<AdminClient['from']>) => ReturnType<AdminClient['from']>,
) {
  let query = supabase.from('booking_requests').select('id', { count: 'exact', head: true });
  if (applyFilter) {
    query = applyFilter(query);
  }
  const { count, error } = await query;
  if (error) {
    console.error('Failed to count booking requests', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return 0;
  }
  return count ?? 0;
}

async function fetchOwnerSummary(supabase: AdminClient) {
  const [pendingOwnersCount, verifiedOwnersCount, verifiedInventoryResponse] = await Promise.all([
    countRows(supabase, 'owners', (query) => query.eq('verification', 'pending')),
    countRows(supabase, 'owners', (query) => query.eq('verification', 'verified')),
    supabase
      .from('owner_memberships')
      .select('owner_id, owners!inner(verification)')
      .gt('points_available', 0)
      .eq('owners.verification', 'verified'),
  ]);

  if (verifiedInventoryResponse.error) {
    console.error('Failed to calculate verified owners with inventory', verifiedInventoryResponse.error);
  }

  const verifiedOwnersWithInventoryCount = new Set(
    (verifiedInventoryResponse.data ?? [])
      .map((row) => row.owner_id)
      .filter((id): id is string => Boolean(id)),
  ).size;

  return { pendingOwnersCount, verifiedOwnersCount, verifiedOwnersWithInventoryCount };
}

async function fetchLatestBookingRequests(supabase: AdminClient, filters: BookingRequestFilters): Promise<PaginatedResult<ReturnType<typeof mapBookingRow>>> {
  const pageSize = PAGE_SIZE;
  const countQuery = applyBookingFilters(supabase.from('booking_requests').select('id', { count: 'exact', head: true }), filters);
  const { count: total = 0, error: countError } = await countQuery;
  if (countError) {
    console.error('Failed to count booking requests', {
      code: countError.code,
      message: countError.message,
      details: countError.details,
      hint: countError.hint,
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(filters.page ?? 1, 1), totalPages);
  const offset = (currentPage - 1) * pageSize;

  const dataQuery = applyBookingFilters(
    supabase
      .from('booking_requests')
      .select(
        'id, lead_guest_name, lead_guest_email, check_in, check_out, status, created_at, primary_room, total_points, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)',
      )
      .order('created_at', { ascending: false }),
    filters,
  ).range(offset, offset + pageSize - 1);

  const { data, error } = await dataQuery;
  if (error) {
    console.error('Failed to load booking requests', error);
    return { rows: [], total, page: currentPage, pageSize };
  }

  return { rows: (data ?? []).map(mapBookingRow), total, page: total === 0 ? 1 : currentPage, pageSize };
}

function mapBookingRow(row: BookingRequestRow) {
  return {
    id: row.id,
    guestName: row.lead_guest_name,
    guestEmail: row.lead_guest_email,
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: row.status ?? 'draft',
    createdAt: row.created_at,
    resortName: row.primary_resort?.name ?? null,
    roomLabel: row.primary_room,
    pointsRequested: row.total_points,
  };
}

async function fetchOwnerPipelineTable(supabase: AdminClient, filters: OwnerPipelineFilters): Promise<PaginatedResult<ReturnType<typeof mapOwnerRow>>> {
  const pageSize = PAGE_SIZE;
  const countQuery = applyOwnerFilters(supabase.from('owners').select('id', { count: 'exact', head: true }), filters);
  const { count: total = 0, error: countError } = await countQuery;
  if (countError) {
    console.error('Failed to count owners', countError);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(filters.page ?? 1, 1), totalPages);
  const offset = (currentPage - 1) * pageSize;

  const dataQuery = applyOwnerFilters(
    supabase
      .from('owners')
      .select(
        'id, verification, created_at, profiles:profiles!owners_user_id_fkey(display_name, email), owner_memberships(points_owned, points_available, resort:resorts(name), use_year)'
      )
      .order('created_at', { ascending: false }),
    filters,
  ).range(offset, offset + pageSize - 1);

  const { data, error } = await dataQuery;
  if (error) {
    console.error('Failed to load owner pipeline table', error);
    return { rows: [], total, page: currentPage, pageSize };
  }

  return { rows: (data ?? []).map(mapOwnerRow), total, page: total === 0 ? 1 : currentPage, pageSize };
}

function mapOwnerRow(row: OwnerRow) {
  const memberships = Array.isArray(row.owner_memberships) ? row.owner_memberships : [];
  const pointsOwned = memberships.reduce((sum, membership) => sum + (membership.points_owned ?? 0), 0);
  const pointsAvailable = memberships.reduce((sum, membership) => sum + (membership.points_available ?? 0), 0);
  const primary = memberships[0];
  return {
    id: row.id,
    displayName: row.profiles?.display_name ?? null,
    email: row.profiles?.email ?? null,
    primaryResort: primary?.resort?.name ?? null,
    useYear: primary?.use_year ?? null,
    pointsOwned,
    pointsAvailable,
    verification: row.verification ?? 'pending',
    createdAt: row.created_at,
  };
}

async function fetchComplianceSnapshot(supabase: AdminClient) {
  const [ownerTotal, docsResponse] = await Promise.all([
    countRows(supabase, 'owners'),
    supabase.from('owner_documents').select('owner_id'),
  ]);

  if (docsResponse.error) {
    console.error('Failed to load owner documents', docsResponse.error);
  }

  const docRows = (docsResponse.data ?? []) as OwnerDocumentRow[];
  const ownersWithDocs = new Set(docRows.map((row) => row.owner_id).filter((id): id is string => Boolean(id))).size;
  const documentsTotal = docRows.length;
  const coveragePct = ownerTotal === 0 ? 0 : Math.round((ownersWithDocs / ownerTotal) * 100);

  return {
    ownersWithDocs,
    ownersWithoutDocs: Math.max(ownerTotal - ownersWithDocs, 0),
    documentsTotal,
    coveragePct,
  };
}

async function countRows(
  supabase: AdminClient,
  table: string,
  applyFilter?: (query: ReturnType<AdminClient['from']>) => ReturnType<AdminClient['from']>,
) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  if (applyFilter) {
    query = applyFilter(query);
  }
  const { count, error } = await query;
  if (error) {
    console.error(`Failed to count ${table}`, error);
    return 0;
  }
  return count ?? 0;
}

function applyBookingFilters(query: ReturnType<AdminClient['from']>, filters: BookingRequestFilters) {
  let next = query;
  if (filters.status) {
    next = next.eq('status', filters.status);
  }
  if (filters.query) {
    const pattern = `%${escapeLike(filters.query)}%`;
    next = next.or(`lead_guest_email.ilike.${pattern},lead_guest_name.ilike.${pattern}`);
  }
  return next;
}

function applyOwnerFilters(query: ReturnType<AdminClient['from']>, filters: OwnerPipelineFilters) {
  let next = query;
  if (filters.verification) {
    next = next.eq('verification', filters.verification);
  }
  if (filters.query) {
    const pattern = `%${escapeLike(filters.query)}%`;
    next = next.or(`profiles.display_name.ilike.${pattern},profiles.email.ilike.${pattern}`);
  }
  return next;
}

function escapeLike(term: string) {
  return term.replace(/[%_]/g, (char) => `\\${char}`);
}

function getParam(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  if (!params) return undefined;
  const value = params[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function normalizeStatus(value: string | undefined, options: { value: string }[]) {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === 'all') return undefined;
  const allowed = new Set(options.map((option) => option.value));
  return allowed.has(normalized) ? normalized : undefined;
}

function parsePageParam(value?: string) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
}

function normalizeSearchParams(params?: Record<string, string | string[] | undefined>) {
  const result = new URLSearchParams();
  if (!params) return result;
  for (const [key, value] of Object.entries(params)) {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized) {
      result.set(key, normalized);
    }
  }
  return result;
}

function buildAdminHref(params: URLSearchParams, updates: Record<string, string | number | undefined | null>) {
  const next = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null || value === '') {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }
  const query = next.toString();
  return query ? `/admin?${query}` : '/admin';
}

function HiddenInput({ name, value }: { name: string; value?: string | null }) {
  if (!value || value.length === 0) {
    return null;
  }
  return <input type="hidden" name={name} value={value} />;
}

function PaginationLink({ disabled, href, children }: { disabled: boolean; href: string; children: ReactNode }) {
  if (disabled) {
    return (
      <span className="rounded-full border border-slate-200 px-3 py-1 text-slate-300">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className="rounded-full border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50">
      {children}
    </Link>
  );
}
