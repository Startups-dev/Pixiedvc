import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service-client";

const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/New_York";
const PAYABLE_CONVERSION_STATUSES = new Set(["pending", "approved", "paid"]);
const APPROVED_CONVERSION_STATUSES = new Set(["approved", "paid"]);
const PAID_CONVERSION_STATUSES = new Set(["paid"]);
const PENDING_PAYOUT_STATUSES = new Set(["pending", "scheduled", "processing"]);

export type AffiliateAnalyticsRangeKey = "today" | "7d" | "30d" | "month" | "custom";
export type AffiliateLeaderboardSort =
  | "booking_value"
  | "confirmed_conversions"
  | "commission_earned"
  | "clicks"
  | "conversion_rate";

export type AffiliateAnalyticsDateRange = {
  key: AffiliateAnalyticsRangeKey;
  label: string;
  startDate: Date;
  endDate: Date;
};

type AffiliateRow = {
  id: string;
  display_name: string | null;
  email: string | null;
  status: string | null;
  tier: string | null;
  slug: string | null;
  referral_code: string | null;
  commission_rate: number | string | null;
};

type ClickRow = {
  affiliate_id: string | null;
  click_id: string | null;
  clicked_at: string;
  visitor_id: string | null;
  visitor_session_id: string | null;
  visitor_session_row_id: string | null;
  landing_path: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  attribution_source?: string | null;
};

type SessionRow = {
  id: string;
  visitor_id: string | null;
  session_id: string | null;
  started_at: string;
  landing_page_path: string | null;
  referrer: string | null;
  utm_source: string | null;
};

type PageviewRow = {
  session_row_id: string | null;
  visitor_id: string | null;
  session_id: string | null;
  page_path: string | null;
  created_at: string;
};

type BookingRequestRow = {
  id: string;
  affiliate_id: string | null;
  affiliate_click_id: string | null;
  visitor_session_row_id: string | null;
  visitor_session_id: string | null;
  visitor_id: string | null;
  referral_code: string | null;
  attribution_source: string | null;
  referral_utm_source: string | null;
  referral_utm_medium: string | null;
  referral_utm_campaign: string | null;
  created_at: string;
  status: string | null;
  check_in: string | null;
  check_out: string | null;
  primary_room: string | null;
  primary_resort?: { name: string | null } | null;
};

type ConversionRow = {
  id: string;
  affiliate_id: string | null;
  booking_request_id: string | null;
  status: string | null;
  booking_amount_usd: number | string | null;
  commission_amount_usd: number | string | null;
  commission_rate: number | string | null;
  confirmed_at: string | null;
  created_at: string;
};

type PayoutItemRow = {
  id: string;
  affiliate_id: string | null;
  conversion_id: string | null;
  booking_request_id: string | null;
  payout_run_id: string | null;
  amount_usd: number | string | null;
  status: string | null;
  created_at: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  adjusted_at: string | null;
  voided_at: string | null;
  payout_run?: {
    id: string;
    period_start: string | null;
    period_end: string | null;
    status: string | null;
    paid_at: string | null;
  } | null;
};

type PayoutRunRow = {
  id: string;
  status: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
  paid_at: string | null;
};

type RawDataset = {
  affiliates: AffiliateRow[];
  clicks: ClickRow[];
  sessions: SessionRow[];
  pageviews: PageviewRow[];
  requests: BookingRequestRow[];
  conversions: ConversionRow[];
  payoutItems: PayoutItemRow[];
  payoutRuns: PayoutRunRow[];
};

type AttributionSourceInfo = {
  label: string;
  source?: string;
  medium?: string;
  campaign?: string;
  landingPath: string;
};

export type MetricCard = {
  label: string;
  value: number;
  formattedValue?: string;
  hint: string;
};

export type FunnelStage = {
  label: string;
  count: number;
  priorRate: number | null;
  clickRate: number | null;
};

export type AffiliateLeaderboardRow = {
  affiliateId: string;
  affiliateName: string;
  status: string;
  clicks: number;
  uniqueVisitors: number;
  bookingRequests: number;
  confirmedConversions: number;
  clickToRequestRate: number | null;
  requestToConversionRate: number | null;
  bookingValue: number;
  commissionEarned: number;
  pendingPayout: number;
  paid: number;
};

export type TrafficBreakdownRow = {
  label: string;
  source?: string;
  medium?: string;
  campaign?: string;
  clicks: number;
  uniqueVisitors: number;
  bookingRequests: number;
  conversions: number;
  bookingValue: number;
  commissionEarned: number;
};

export type DailyTrendRow = {
  date: string;
  clicks: number;
  bookingRequests: number;
  conversions: number;
};

export type AdminAffiliateAnalyticsOverview = {
  range: AffiliateAnalyticsDateRange;
  metrics: {
    uniqueVisitors: number;
    affiliateClicks: number;
    attributedBookingRequests: number;
    confirmedConversions: number;
    attributedBookingValue: number;
    commissionEarned: number;
    pendingPayouts: number;
    paidPayouts: number;
    affiliateVisitors: number;
    nonAffiliateVisitors: number;
    approvedCommissionAwaitingRun: number;
    openPayoutRuns: number;
    paidPayoutRuns: number;
    lifetimePaid: number;
  };
  funnel: FunnelStage[];
  leaderboard: AffiliateLeaderboardRow[];
  trafficSources: TrafficBreakdownRow[];
  landingPages: TrafficBreakdownRow[];
  utmCampaigns: TrafficBreakdownRow[];
  dailyTrends: DailyTrendRow[];
};

export type AffiliateAnalyticsDetail = {
  range: AffiliateAnalyticsDateRange;
  affiliate: AffiliateRow & { referralUrl: string };
  metrics: {
    clicks: number;
    uniqueVisitors: number;
    pageviews: number;
    bookingRequests: number;
    confirmedConversions: number;
    bookingValue: number;
    commissionEarned: number;
    pendingPayout: number;
    paid: number;
  };
  trafficSources: TrafficBreakdownRow[];
  landingPages: TrafficBreakdownRow[];
  utmCampaigns: TrafficBreakdownRow[];
  recentBookingActivity: Array<{
    id: string;
    createdAt: string;
    status: string | null;
    checkIn: string | null;
    checkOut: string | null;
    resortName: string | null;
    roomType: string | null;
    attributionSource: string;
    conversionStatus: string | null;
    bookingAmount: number | null;
    commissionAmount: number | null;
  }>;
  payoutHistory: Array<{
    id: string;
    conversionId: string | null;
    bookingRequestId: string | null;
    amount: number;
    status: string;
    periodStart: string | null;
    periodEnd: string | null;
    paymentMethod: string | null;
    paymentReference: string | null;
    paidAt: string | null;
    adjusted: boolean;
    voided: boolean;
  }>;
};

function getClient() {
  const admin = getSupabaseAdminClient();
  if (admin) return admin;
  return createServiceClient();
}

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = getPart("hour");

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: hour === 24 ? 0 : hour,
    minute: getPart("minute"),
    second: getPart("second"),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneDateParts(date, timeZone);
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return localAsUtc - date.getTime();
}

function zonedLocalTimeToUtc(
  timeZone: string,
  input: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
) {
  const utcGuess = new Date(
    Date.UTC(input.year, input.month - 1, input.day, input.hour ?? 0, input.minute ?? 0, input.second ?? 0),
  );
  return new Date(utcGuess.getTime() - getTimeZoneOffsetMs(utcGuess, timeZone));
}

function startOfDay(date: Date) {
  const parts = getTimeZoneDateParts(date, APP_TIMEZONE);
  return zonedLocalTimeToUtc(APP_TIMEZONE, { year: parts.year, month: parts.month, day: parts.day });
}

function startOfMonth(date: Date) {
  const parts = getTimeZoneDateParts(date, APP_TIMEZONE);
  return zonedLocalTimeToUtc(APP_TIMEZONE, { year: parts.year, month: parts.month, day: 1 });
}

function parseDateParam(value?: string | null, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  return zonedLocalTimeToUtc(APP_TIMEZONE, {
    year,
    month,
    day,
    hour: endOfDay ? 23 : 0,
    minute: endOfDay ? 59 : 0,
    second: endOfDay ? 59 : 0,
  });
}

export function resolveAffiliateAnalyticsDateRange(input?: {
  range?: string | null;
  start?: string | null;
  end?: string | null;
}): AffiliateAnalyticsDateRange {
  const now = new Date();
  const todayStart = startOfDay(now);
  const key = input?.range;

  if (key === "today") {
    return { key: "today", label: "Today", startDate: todayStart, endDate: now };
  }

  if (key === "7d") {
    return {
      key: "7d",
      label: "Last 7 Days",
      startDate: new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000),
      endDate: now,
    };
  }

  if (key === "month") {
    return { key: "month", label: "This Month", startDate: startOfMonth(now), endDate: now };
  }

  if (key === "custom") {
    const start = parseDateParam(input?.start);
    const end = parseDateParam(input?.end, true);
    if (start && end && start <= end) {
      return { key: "custom", label: "Custom Range", startDate: start, endDate: end };
    }
  }

  return {
    key: "30d",
    label: "Last 30 Days",
    startDate: new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000),
    endDate: now,
  };
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inRange(iso: string | null | undefined, range: AffiliateAnalyticsDateRange) {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return time >= range.startDate.getTime() && time <= range.endDate.getTime();
}

function effectiveConversionDate(row: ConversionRow) {
  return row.confirmed_at ?? row.created_at;
}

function getDateKey(iso: string) {
  const parts = getTimeZoneDateParts(new Date(iso), APP_TIMEZONE);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function domainFromReferrer(referrer: string | null | undefined) {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return referrer.slice(0, 80);
  }
}

function visitorKey(row: Pick<ClickRow, "visitor_id" | "visitor_session_id" | "click_id">) {
  return row.visitor_id ?? row.visitor_session_id ?? row.click_id ?? null;
}

function requestVisitorKey(row: BookingRequestRow) {
  return row.visitor_id ?? row.visitor_session_id ?? row.affiliate_click_id ?? row.id;
}

function labelForSource(row: {
  utm_source?: string | null;
  referrer?: string | null;
  attribution_source?: string | null;
}) {
  if (row.utm_source) return row.utm_source;
  const domain = domainFromReferrer(row.referrer);
  if (domain) return domain;
  if (row.attribution_source) return row.attribution_source;
  return "Unknown";
}

function normalizeStatus(status: string | null | undefined) {
  return status ?? "unknown";
}

async function fetchAll<T>(buildQuery: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const result = await buildQuery(from, from + pageSize - 1);
    if (result.error) throw new Error(result.error.message);
    const batch = Array.isArray(result.data) ? (result.data as T[]) : [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
}

async function loadDataset(range: AffiliateAnalyticsDateRange, affiliateId?: string): Promise<RawDataset> {
  const client = getClient();
  const startIso = range.startDate.toISOString();
  const endIso = range.endDate.toISOString();

  const [
    affiliates,
    clicks,
    sessions,
    pageviews,
    requests,
    allConversions,
    payoutItems,
    payoutRuns,
  ] = await Promise.all([
    fetchAll<AffiliateRow>((from, to) => {
      let query = client
        .from("affiliates")
        .select("id, display_name, email, status, tier, slug, referral_code, commission_rate")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (affiliateId) query = query.eq("id", affiliateId);
      return query;
    }),
    fetchAll<ClickRow>((from, to) => {
      let query = client
        .from("affiliate_clicks")
        .select(
          "affiliate_id, click_id, clicked_at, visitor_id, visitor_session_id, visitor_session_row_id, landing_path, referrer, utm_source, utm_medium, utm_campaign",
        )
        .gte("clicked_at", startIso)
        .lte("clicked_at", endIso)
        .order("clicked_at", { ascending: false })
        .range(from, to);
      if (affiliateId) query = query.eq("affiliate_id", affiliateId);
      return query;
    }),
    fetchAll<SessionRow>((from, to) =>
      client
        .from("visitor_sessions")
        .select("id, visitor_id, session_id, started_at, landing_page_path, referrer, utm_source")
        .gte("started_at", startIso)
        .lte("started_at", endIso)
        .order("started_at", { ascending: false })
        .range(from, to),
    ),
    fetchAll<PageviewRow>((from, to) =>
      client
        .from("visitor_pageviews")
        .select("session_row_id, visitor_id, session_id, page_path, created_at")
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
    fetchAll<BookingRequestRow>((from, to) => {
      let query = client
        .from("booking_requests")
        .select(
          "id, affiliate_id, affiliate_click_id, visitor_session_row_id, visitor_session_id, visitor_id, referral_code, attribution_source, referral_utm_source, referral_utm_medium, referral_utm_campaign, created_at, status, check_in, check_out, primary_room, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)",
        )
        .not("affiliate_id", "is", null)
        .gte("created_at", startIso)
        .lte("created_at", endIso)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (affiliateId) query = query.eq("affiliate_id", affiliateId);
      return query;
    }),
    fetchAll<ConversionRow>((from, to) => {
      let query = client
        .from("affiliate_conversions")
        .select(
          "id, affiliate_id, booking_request_id, status, booking_amount_usd, commission_amount_usd, commission_rate, confirmed_at, created_at",
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (affiliateId) query = query.eq("affiliate_id", affiliateId);
      return query;
    }),
    fetchAll<PayoutItemRow>((from, to) => {
      let query = client
        .from("affiliate_payout_items")
        .select(
          "id, affiliate_id, conversion_id, booking_request_id, payout_run_id, amount_usd, status, created_at, paid_at, payment_method, payment_reference, adjusted_at, voided_at, payout_run:affiliate_payout_runs(id, period_start, period_end, status, paid_at)",
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      if (affiliateId) query = query.eq("affiliate_id", affiliateId);
      return query;
    }),
    fetchAll<PayoutRunRow>((from, to) =>
      client
        .from("affiliate_payout_runs")
        .select("id, status, period_start, period_end, created_at, paid_at")
        .order("created_at", { ascending: false })
        .range(from, to),
    ),
  ]);

  const conversions = allConversions.filter((row) => inRange(effectiveConversionDate(row), range));
  return { affiliates, clicks, sessions, pageviews, requests, conversions, payoutItems, payoutRuns };
}

function buildClickMaps(clicks: ClickRow[]) {
  return {
    byClickId: new Map(clicks.map((row) => [row.click_id, row]).filter(([id]) => Boolean(id)) as Array<[string, ClickRow]>),
    bySessionRowId: new Map(
      clicks.map((row) => [row.visitor_session_row_id, row]).filter(([id]) => Boolean(id)) as Array<[string, ClickRow]>,
    ),
    bySessionId: new Map(
      clicks.map((row) => [row.visitor_session_id, row]).filter(([id]) => Boolean(id)) as Array<[string, ClickRow]>,
    ),
    byVisitorId: new Map(clicks.map((row) => [row.visitor_id, row]).filter(([id]) => Boolean(id)) as Array<[string, ClickRow]>),
  };
}

function sourceForRequest(request: BookingRequestRow, clickMaps: ReturnType<typeof buildClickMaps>): AttributionSourceInfo {
  const click =
    (request.affiliate_click_id ? clickMaps.byClickId.get(request.affiliate_click_id) : null) ??
    (request.visitor_session_row_id ? clickMaps.bySessionRowId.get(request.visitor_session_row_id) : null) ??
    (request.visitor_session_id ? clickMaps.bySessionId.get(request.visitor_session_id) : null) ??
    (request.visitor_id ? clickMaps.byVisitorId.get(request.visitor_id) : null);

  return {
    label: click
      ? labelForSource(click)
      : request.referral_utm_source ?? request.attribution_source ?? (request.referral_code ? "Legacy attribution" : "Unknown"),
    source: click?.utm_source ?? request.referral_utm_source ?? undefined,
    medium: click?.utm_medium ?? request.referral_utm_medium ?? undefined,
    campaign: click?.utm_campaign ?? request.referral_utm_campaign ?? undefined,
    landingPath: click?.landing_path ?? "Unknown",
  };
}

function sourceForConversion(
  conversion: ConversionRow,
  requestsById: Map<string, BookingRequestRow>,
  clickMaps: ReturnType<typeof buildClickMaps>,
) : AttributionSourceInfo {
  const request = conversion.booking_request_id ? requestsById.get(conversion.booking_request_id) : null;
  return request ? sourceForRequest(request, clickMaps) : { label: "Legacy attribution", landingPath: "Unknown" };
}

function rate(numerator: number, denominator: number) {
  if (!denominator) return null;
  return numerator / denominator;
}

function createEmptyBreakdown(label: string): TrafficBreakdownRow {
  return {
    label,
    clicks: 0,
    uniqueVisitors: 0,
    bookingRequests: 0,
    conversions: 0,
    bookingValue: 0,
    commissionEarned: 0,
  };
}

function buildBreakdowns(dataset: RawDataset, options?: { affiliateId?: string }) {
  const clickMaps = buildClickMaps(dataset.clicks);
  const requestsById = new Map(dataset.requests.map((row) => [row.id, row]));
  const sourceMap = new Map<string, TrafficBreakdownRow & { visitorKeys: Set<string> }>();
  const landingMap = new Map<string, TrafficBreakdownRow & { visitorKeys: Set<string> }>();
  const campaignMap = new Map<string, TrafficBreakdownRow & { visitorKeys: Set<string> }>();

  const ensure = (map: Map<string, TrafficBreakdownRow & { visitorKeys: Set<string> }>, key: string) => {
    const existing = map.get(key);
    if (existing) return existing;
    const created = { ...createEmptyBreakdown(key), visitorKeys: new Set<string>() };
    map.set(key, created);
    return created;
  };

  const clicks = options?.affiliateId
    ? dataset.clicks.filter((row) => row.affiliate_id === options.affiliateId)
    : dataset.clicks;
  const requests = options?.affiliateId
    ? dataset.requests.filter((row) => row.affiliate_id === options.affiliateId)
    : dataset.requests;
  const conversions = options?.affiliateId
    ? dataset.conversions.filter((row) => row.affiliate_id === options.affiliateId)
    : dataset.conversions;

  for (const click of clicks) {
    const source = labelForSource(click);
    const landing = click.landing_path || "Unknown";
    const campaignKey = click.utm_campaign ? `${click.utm_campaign} · ${click.utm_source ?? "Unknown"} · ${click.utm_medium ?? "Unknown"}` : "Unknown";
    const key = visitorKey(click);

    for (const row of [ensure(sourceMap, source), ensure(landingMap, landing), ensure(campaignMap, campaignKey)]) {
      row.clicks += 1;
      if (key) row.visitorKeys.add(key);
    }

    const campaign = ensure(campaignMap, campaignKey);
    campaign.campaign = click.utm_campaign ?? undefined;
    campaign.source = click.utm_source ?? undefined;
    campaign.medium = click.utm_medium ?? undefined;
  }

  for (const request of requests) {
    const source = sourceForRequest(request, clickMaps);
    ensure(sourceMap, source.label).bookingRequests += 1;
    ensure(landingMap, source.landingPath).bookingRequests += 1;
    const campaignKey = source.campaign ? `${source.campaign} · ${source.source ?? "Unknown"} · ${source.medium ?? "Unknown"}` : "Unknown";
    const campaign = ensure(campaignMap, campaignKey);
    campaign.bookingRequests += 1;
    campaign.campaign = source.campaign;
    campaign.source = source.source;
    campaign.medium = source.medium;
  }

  for (const conversion of conversions.filter((row) => PAYABLE_CONVERSION_STATUSES.has(normalizeStatus(row.status)))) {
    const source = sourceForConversion(conversion, requestsById, clickMaps);
    const bookingValue = toNumber(conversion.booking_amount_usd);
    const commission = toNumber(conversion.commission_amount_usd);
    const sourceRow = ensure(sourceMap, source.label);
    sourceRow.conversions += 1;
    sourceRow.bookingValue += bookingValue;
    sourceRow.commissionEarned += commission;
    const landingRow = ensure(landingMap, source.landingPath);
    landingRow.conversions += 1;
    landingRow.bookingValue += bookingValue;
    landingRow.commissionEarned += commission;
    const campaignKey = source.campaign ? `${source.campaign} · ${source.source ?? "Unknown"} · ${source.medium ?? "Unknown"}` : "Unknown";
    const campaign = ensure(campaignMap, campaignKey);
    campaign.conversions += 1;
    campaign.bookingValue += bookingValue;
    campaign.commissionEarned += commission;
    campaign.campaign = source.campaign;
    campaign.source = source.source;
    campaign.medium = source.medium;
  }

  const finalize = (rows: Array<TrafficBreakdownRow & { visitorKeys: Set<string> }>) =>
    rows
      .map(({ visitorKeys, ...row }) => ({ ...row, uniqueVisitors: visitorKeys.size }))
      .sort((a, b) => b.clicks + b.bookingRequests + b.conversions - (a.clicks + a.bookingRequests + a.conversions))
      .slice(0, 20);

  return {
    trafficSources: finalize(Array.from(sourceMap.values())),
    landingPages: finalize(Array.from(landingMap.values())),
    utmCampaigns: finalize(Array.from(campaignMap.values())),
  };
}

function buildLeaderboard(dataset: RawDataset, range: AffiliateAnalyticsDateRange, sortBy: AffiliateLeaderboardSort = "booking_value") {
  const rows = dataset.affiliates.map((affiliate) => {
    const clicks = dataset.clicks.filter((row) => row.affiliate_id === affiliate.id);
    const requests = dataset.requests.filter((row) => row.affiliate_id === affiliate.id);
    const conversions = dataset.conversions.filter(
      (row) => row.affiliate_id === affiliate.id && PAYABLE_CONVERSION_STATUSES.has(normalizeStatus(row.status)),
    );
    const payoutItems = dataset.payoutItems.filter((row) => row.affiliate_id === affiliate.id);
    const uniqueVisitors = new Set(clicks.map(visitorKey).filter(Boolean)).size;
    const bookingValue = conversions.reduce((sum, row) => sum + toNumber(row.booking_amount_usd), 0);
    const commissionEarned = conversions.reduce((sum, row) => sum + toNumber(row.commission_amount_usd), 0);
    const pendingPayout = payoutItems
      .filter((row) => PENDING_PAYOUT_STATUSES.has(normalizeStatus(row.status)) && inRange(row.created_at, range))
      .reduce((sum, row) => sum + toNumber(row.amount_usd), 0);
    const paid = payoutItems
      .filter((row) => normalizeStatus(row.status) === "paid" && inRange(row.paid_at ?? row.created_at, range))
      .reduce((sum, row) => sum + toNumber(row.amount_usd), 0);

    return {
      affiliateId: affiliate.id,
      affiliateName: affiliate.display_name ?? affiliate.email ?? "Unnamed affiliate",
      status: normalizeStatus(affiliate.status),
      clicks: clicks.length,
      uniqueVisitors,
      bookingRequests: requests.length,
      confirmedConversions: conversions.length,
      clickToRequestRate: rate(requests.length, clicks.length),
      requestToConversionRate: rate(conversions.length, requests.length),
      bookingValue,
      commissionEarned,
      pendingPayout,
      paid,
    } satisfies AffiliateLeaderboardRow;
  });

  const sorters: Record<AffiliateLeaderboardSort, (row: AffiliateLeaderboardRow) => number> = {
    booking_value: (row) => row.bookingValue,
    confirmed_conversions: (row) => row.confirmedConversions,
    commission_earned: (row) => row.commissionEarned,
    clicks: (row) => row.clicks,
    conversion_rate: (row) => row.requestToConversionRate ?? 0,
  };

  return rows.sort((a, b) => sorters[sortBy](b) - sorters[sortBy](a)).slice(0, 100);
}

export async function getAdminAffiliateAnalyticsOverview(input: {
  startDate: Date;
  endDate: Date;
  range?: AffiliateAnalyticsDateRange;
  sortBy?: AffiliateLeaderboardSort;
}): Promise<AdminAffiliateAnalyticsOverview> {
  const range = input.range ?? { key: "custom", label: "Custom Range", startDate: input.startDate, endDate: input.endDate };
  const dataset = await loadDataset(range);
  const payableConversions = dataset.conversions.filter((row) => PAYABLE_CONVERSION_STATUSES.has(normalizeStatus(row.status)));
  const approvedConversions = dataset.conversions.filter((row) => APPROVED_CONVERSION_STATUSES.has(normalizeStatus(row.status)));
  const paidConversions = dataset.conversions.filter((row) => PAID_CONVERSION_STATUSES.has(normalizeStatus(row.status)));
  const uniqueAffiliateVisitorKeys = new Set(dataset.clicks.map(visitorKey).filter(Boolean));
  const affiliateVisitorCount = uniqueAffiliateVisitorKeys.size;
  const allVisitorCount = new Set(dataset.sessions.map((row) => row.visitor_id ?? row.session_id).filter(Boolean)).size;
  const nonAffiliateVisitors = Math.max(0, allVisitorCount - affiliateVisitorCount);
  const paidPayoutItems = dataset.payoutItems.filter(
    (row) => normalizeStatus(row.status) === "paid" && inRange(row.paid_at ?? row.created_at, range),
  );
  const pendingPayoutItems = dataset.payoutItems.filter(
    (row) => PENDING_PAYOUT_STATUSES.has(normalizeStatus(row.status)) && inRange(row.created_at, range),
  );
  const approvedAwaitingRun = dataset.conversions.filter(
    (row) =>
      normalizeStatus(row.status) === "approved" &&
      !dataset.payoutItems.some((item) => item.conversion_id === row.id) &&
      inRange(effectiveConversionDate(row), range),
  );
  const openPayoutRuns = dataset.payoutRuns.filter((row) => normalizeStatus(row.status) !== "paid" && normalizeStatus(row.status) !== "void");
  const paidPayoutRuns = dataset.payoutRuns.filter((row) => normalizeStatus(row.status) === "paid" && inRange(row.paid_at ?? row.created_at, range));
  const lifetimePaid = dataset.payoutItems
    .filter((row) => normalizeStatus(row.status) === "paid")
    .reduce((sum, row) => sum + toNumber(row.amount_usd), 0);
  const bookingValue = payableConversions.reduce((sum, row) => sum + toNumber(row.booking_amount_usd), 0);
  const commissionEarned = payableConversions.reduce((sum, row) => sum + toNumber(row.commission_amount_usd), 0);
  const metrics = {
    uniqueVisitors: affiliateVisitorCount,
    affiliateClicks: dataset.clicks.length,
    attributedBookingRequests: dataset.requests.length,
    confirmedConversions: payableConversions.length,
    attributedBookingValue: bookingValue,
    commissionEarned,
    pendingPayouts: pendingPayoutItems.reduce((sum, row) => sum + toNumber(row.amount_usd), 0),
    paidPayouts: paidPayoutItems.reduce((sum, row) => sum + toNumber(row.amount_usd), 0),
    affiliateVisitors: affiliateVisitorCount,
    nonAffiliateVisitors,
    approvedCommissionAwaitingRun: approvedAwaitingRun.reduce((sum, row) => sum + toNumber(row.commission_amount_usd), 0),
    openPayoutRuns: openPayoutRuns.length,
    paidPayoutRuns: paidPayoutRuns.length,
    lifetimePaid,
  };
  const funnelCounts = [
    ["Affiliate Clicks", dataset.clicks.length],
    ["Unique Visitors", affiliateVisitorCount],
    ["Booking Requests", dataset.requests.length],
    ["Confirmed Conversions", payableConversions.length],
    ["Approved Conversions", approvedConversions.length],
    ["Paid Conversions", paidConversions.length],
  ] as const;
  const funnel = funnelCounts.map(([label, count], index) => ({
    label,
    count,
    priorRate: index === 0 ? null : rate(count, funnelCounts[index - 1][1]),
    clickRate: index === 0 ? null : rate(count, funnelCounts[0][1]),
  }));
  const breakdowns = buildBreakdowns(dataset);
  const dailyMap = new Map<string, DailyTrendRow>();
  const ensureDay = (date: string) => {
    const existing = dailyMap.get(date);
    if (existing) return existing;
    const created = { date, clicks: 0, bookingRequests: 0, conversions: 0 };
    dailyMap.set(date, created);
    return created;
  };
  dataset.clicks.forEach((row) => (ensureDay(getDateKey(row.clicked_at)).clicks += 1));
  dataset.requests.forEach((row) => (ensureDay(getDateKey(row.created_at)).bookingRequests += 1));
  payableConversions.forEach((row) => (ensureDay(getDateKey(effectiveConversionDate(row))).conversions += 1));

  return {
    range,
    metrics,
    funnel,
    leaderboard: buildLeaderboard(dataset, range, input.sortBy),
    trafficSources: breakdowns.trafficSources,
    landingPages: breakdowns.landingPages,
    utmCampaigns: breakdowns.utmCampaigns,
    dailyTrends: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export async function getAffiliateLeaderboard(input: {
  startDate: Date;
  endDate: Date;
  sortBy?: AffiliateLeaderboardSort;
}) {
  return (
    await getAdminAffiliateAnalyticsOverview({
      startDate: input.startDate,
      endDate: input.endDate,
      sortBy: input.sortBy,
    })
  ).leaderboard;
}

export async function getAffiliateTrafficBreakdown(input: {
  affiliateId?: string;
  startDate: Date;
  endDate: Date;
}) {
  const range: AffiliateAnalyticsDateRange = {
    key: "custom",
    label: "Custom Range",
    startDate: input.startDate,
    endDate: input.endDate,
  };
  const dataset = await loadDataset(range, input.affiliateId);
  return buildBreakdowns(dataset, { affiliateId: input.affiliateId });
}

export async function getAffiliateAnalyticsDetail(input: {
  affiliateId: string;
  startDate: Date;
  endDate: Date;
  range?: AffiliateAnalyticsDateRange;
}): Promise<AffiliateAnalyticsDetail | null> {
  const range = input.range ?? { key: "custom", label: "Custom Range", startDate: input.startDate, endDate: input.endDate };
  const dataset = await loadDataset(range, input.affiliateId);
  const affiliate = dataset.affiliates[0];
  if (!affiliate) return null;
  const payableConversions = dataset.conversions.filter((row) => PAYABLE_CONVERSION_STATUSES.has(normalizeStatus(row.status)));
  const sessionRowIds = new Set(dataset.clicks.map((row) => row.visitor_session_row_id).filter(Boolean));
  const sessionIds = new Set(dataset.clicks.map((row) => row.visitor_session_id).filter(Boolean));
  const visitorIds = new Set(dataset.clicks.map((row) => row.visitor_id).filter(Boolean));
  const pageviews = dataset.pageviews.filter(
    (row) =>
      (row.session_row_id && sessionRowIds.has(row.session_row_id)) ||
      (row.session_id && sessionIds.has(row.session_id)) ||
      (row.visitor_id && visitorIds.has(row.visitor_id)),
  );
  const conversionsByRequest = new Map(dataset.conversions.map((row) => [row.booking_request_id, row]));
  const payoutItems = dataset.payoutItems.filter((row) => row.affiliate_id === input.affiliateId);
  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://pixiedvc.com";

  return {
    range,
    affiliate: {
      ...affiliate,
      referralUrl: affiliate.slug ? `${siteUrl}/go/${affiliate.slug}` : "Not assigned",
    },
    metrics: {
      clicks: dataset.clicks.length,
      uniqueVisitors: new Set(dataset.clicks.map(visitorKey).filter(Boolean)).size,
      pageviews: pageviews.length,
      bookingRequests: dataset.requests.length,
      confirmedConversions: payableConversions.length,
      bookingValue: payableConversions.reduce((sum, row) => sum + toNumber(row.booking_amount_usd), 0),
      commissionEarned: payableConversions.reduce((sum, row) => sum + toNumber(row.commission_amount_usd), 0),
      pendingPayout: payoutItems
        .filter((row) => PENDING_PAYOUT_STATUSES.has(normalizeStatus(row.status)) && inRange(row.created_at, range))
        .reduce((sum, row) => sum + toNumber(row.amount_usd), 0),
      paid: payoutItems
        .filter((row) => normalizeStatus(row.status) === "paid" && inRange(row.paid_at ?? row.created_at, range))
        .reduce((sum, row) => sum + toNumber(row.amount_usd), 0),
    },
    ...buildBreakdowns(dataset, { affiliateId: input.affiliateId }),
    recentBookingActivity: dataset.requests.slice(0, 25).map((request) => {
      const conversion = conversionsByRequest.get(request.id) ?? null;
      return {
        id: request.id,
        createdAt: request.created_at,
        status: request.status,
        checkIn: request.check_in,
        checkOut: request.check_out,
        resortName: request.primary_resort?.name ?? null,
        roomType: request.primary_room,
        attributionSource: request.attribution_source ?? (request.referral_code ? "Legacy attribution" : "Unknown"),
        conversionStatus: conversion?.status ?? null,
        bookingAmount: conversion ? toNumber(conversion.booking_amount_usd) : null,
        commissionAmount: conversion ? toNumber(conversion.commission_amount_usd) : null,
      };
    }),
    payoutHistory: payoutItems.slice(0, 50).map((item) => ({
      id: item.id,
      conversionId: item.conversion_id,
      bookingRequestId: item.booking_request_id,
      amount: toNumber(item.amount_usd),
      status: normalizeStatus(item.status),
      periodStart: item.payout_run?.period_start ?? null,
      periodEnd: item.payout_run?.period_end ?? null,
      paymentMethod: item.payment_method,
      paymentReference: item.payment_reference,
      paidAt: item.paid_at,
      adjusted: Boolean(item.adjusted_at),
      voided: Boolean(item.voided_at || normalizeStatus(item.status) === "void"),
    })),
  };
}
