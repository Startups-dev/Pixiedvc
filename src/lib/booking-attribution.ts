import "server-only";

import { cookies } from "next/headers";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { SupabaseClient } from "@supabase/supabase-js";

import { readAffiliateCookies } from "@/lib/affiliate-cookies";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export type BookingAttributionSource =
  | "stay_builder"
  | "booking_api"
  | "ready_stay"
  | "guest_package"
  | "future_booking_flow";

type BookingAttributionOptions = {
  source: BookingAttributionSource;
  referralCode?: string | null;
  cookieStore?: ReadonlyRequestCookies;
  client?: SupabaseClient;
};

type AffiliateClickAttributionRow = {
  click_id: string;
  visitor_session_row_id: string | null;
  visitor_session_id: string | null;
  visitor_id: string | null;
  landing_path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
};

type BookingAttributionRow = {
  id: string;
  referral_code: string | null;
  referral_set_at: string | null;
  referral_landing: string | null;
  affiliate_id: string | null;
  affiliate_click_id: string | null;
  visitor_session_row_id: string | null;
  visitor_session_id: string | null;
  visitor_id: string | null;
  attribution_source: string | null;
  referral_utm_source: string | null;
  referral_utm_medium: string | null;
  referral_utm_campaign: string | null;
  referral_utm_term: string | null;
  referral_utm_content: string | null;
};

const BOOKING_ATTRIBUTION_SELECT =
  "id, referral_code, referral_set_at, referral_landing, affiliate_id, affiliate_click_id, visitor_session_row_id, visitor_session_id, visitor_id, attribution_source, referral_utm_source, referral_utm_medium, referral_utm_campaign, referral_utm_term, referral_utm_content";

function normalizeText(value: string | null | undefined, maxLength: number) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeUuid(value: string | null | undefined) {
  const normalized = normalizeText(value, 128);
  if (!normalized) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)
    ? normalized
    : null;
}

function isMissingAttributionColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  const details = "details" in error && typeof error.details === "string" ? error.details : "";
  const combined = `${message} ${details}`.toLowerCase();

  return (
    combined.includes("booking_requests") &&
    (combined.includes("affiliate_id") ||
      combined.includes("affiliate_click_id") ||
      combined.includes("visitor_session") ||
      combined.includes("visitor_id") ||
      combined.includes("attribution_source") ||
      combined.includes("referral_utm") ||
      combined.includes("schema cache"))
  );
}

async function getWriterClient(client?: SupabaseClient) {
  return client ?? getSupabaseAdminClient() ?? (await supabaseServer());
}

async function resolveAffiliate(client: SupabaseClient, referralCode: string) {
  const { data, error } = await client.rpc("resolve_affiliate", { slug_or_code: referralCode });
  if (error || !data || data.length === 0) return null;
  const affiliateId = data[0]?.affiliate_id as string | undefined;
  return affiliateId ?? null;
}

async function getAffiliateClick(client: SupabaseClient, clickId: string | null) {
  if (!clickId) return null;

  const { data, error } = await client
    .from("affiliate_clicks")
    .select(
      "click_id, visitor_session_row_id, visitor_session_id, visitor_id, landing_path, utm_source, utm_medium, utm_campaign, utm_term, utm_content",
    )
    .eq("click_id", clickId)
    .maybeSingle();

  if (error) {
    if (!isMissingAttributionColumn(error)) {
      console.warn("[booking-attribution] affiliate click lookup failed", {
        clickId,
        errorCode: error.code,
        errorMessage: error.message,
      });
    }
    return null;
  }

  return (data ?? null) as AffiliateClickAttributionRow | null;
}

function addIfMissing(
  payload: Record<string, unknown>,
  current: Record<string, unknown>,
  field: string,
  value: unknown,
) {
  if (value === null || value === undefined || value === "") return;
  const existing = current[field];
  if (existing === null || existing === undefined || existing === "") {
    payload[field] = value;
  }
}

async function ensureAffiliateLead(input: {
  client: SupabaseClient;
  bookingRequestId: string;
  affiliateId: string;
  clickId: string | null;
}) {
  const { data: existing } = await input.client
    .from("affiliate_leads")
    .select("id")
    .eq("booking_request_id", input.bookingRequestId)
    .maybeSingle();

  if (existing?.id) return;

  const { error } = await input.client.from("affiliate_leads").insert({
    affiliate_id: input.affiliateId,
    click_id: input.clickId,
    booking_request_id: input.bookingRequestId,
  });

  if (error) {
    console.warn("[booking-attribution] affiliate lead insert failed", {
      bookingRequestId: input.bookingRequestId,
      affiliateId: input.affiliateId,
      clickId: input.clickId,
      errorCode: error.code,
      errorMessage: error.message,
    });
  }
}

async function attachLegacyAttribution(input: {
  client: SupabaseClient;
  bookingRequestId: string;
  referralCode: string;
  affiliateId: string;
  clickId: string | null;
}) {
  const { error } = await input.client
    .from("booking_requests")
    .update({
      referral_code: input.referralCode,
      referral_set_at: new Date().toISOString(),
    })
    .eq("id", input.bookingRequestId)
    .is("referral_code", null);

  if (error) {
    console.warn("[booking-attribution] legacy booking referral update failed", {
      bookingRequestId: input.bookingRequestId,
      affiliateId: input.affiliateId,
      clickId: input.clickId,
      errorCode: error.code,
      errorMessage: error.message,
    });
  }

  await ensureAffiliateLead(input);
}

export async function attachBookingAttribution(bookingRequestId: string, options: BookingAttributionOptions) {
  const client = await getWriterClient(options.client);
  const cookieStore = options.cookieStore ?? (await cookies());
  const cookieAttribution = readAffiliateCookies(cookieStore);
  const referralCode = normalizeText(options.referralCode, 128) ?? cookieAttribution?.affiliateRef ?? null;

  if (!referralCode) return { attached: false, reason: "no_referral" as const };

  const affiliateId = await resolveAffiliate(client, referralCode);
  if (!affiliateId) return { attached: false, reason: "affiliate_not_found" as const };

  const clickId = normalizeUuid(cookieAttribution?.clickId);
  const click = await getAffiliateClick(client, clickId);
  const canonicalClickId = click?.click_id ?? null;
  const visitorSessionId = normalizeText(cookieAttribution?.visitorSessionId, 128) ?? click?.visitor_session_id ?? null;
  const visitorId = normalizeText(cookieAttribution?.visitorId, 128) ?? click?.visitor_id ?? null;

  const { data: booking, error: bookingError } = await client
    .from("booking_requests")
    .select(BOOKING_ATTRIBUTION_SELECT)
    .eq("id", bookingRequestId)
    .maybeSingle();

  if (bookingError) {
    if (isMissingAttributionColumn(bookingError)) {
      await attachLegacyAttribution({ client, bookingRequestId, referralCode, affiliateId, clickId: canonicalClickId });
      return { attached: true, mode: "legacy" as const };
    }

    console.warn("[booking-attribution] booking attribution lookup failed", {
      bookingRequestId,
      affiliateId,
      clickId: canonicalClickId,
      errorCode: bookingError.code,
      errorMessage: bookingError.message,
    });
    return { attached: false, reason: "booking_lookup_failed" as const };
  }

  if (!booking?.id) return { attached: false, reason: "booking_not_found" as const };

  const payload: Record<string, unknown> = {};
  const current = booking as unknown as BookingAttributionRow;

  addIfMissing(payload, current as unknown as Record<string, unknown>, "affiliate_id", affiliateId);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "affiliate_click_id", canonicalClickId);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "visitor_session_row_id", click?.visitor_session_row_id ?? null);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "visitor_session_id", visitorSessionId);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "visitor_id", visitorId);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "referral_code", referralCode);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "referral_set_at", new Date().toISOString());
  addIfMissing(payload, current as unknown as Record<string, unknown>, "referral_landing", click?.landing_path ?? null);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "attribution_source", options.source);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "referral_utm_source", click?.utm_source ?? null);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "referral_utm_medium", click?.utm_medium ?? null);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "referral_utm_campaign", click?.utm_campaign ?? null);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "referral_utm_term", click?.utm_term ?? null);
  addIfMissing(payload, current as unknown as Record<string, unknown>, "referral_utm_content", click?.utm_content ?? null);

  if (Object.keys(payload).length > 0) {
    const { error: updateError } = await client.from("booking_requests").update(payload).eq("id", bookingRequestId);

    if (updateError) {
      if (isMissingAttributionColumn(updateError)) {
        await attachLegacyAttribution({ client, bookingRequestId, referralCode, affiliateId, clickId: canonicalClickId });
        return { attached: true, mode: "legacy" as const };
      }

      console.warn("[booking-attribution] booking attribution update failed", {
        bookingRequestId,
        affiliateId,
        clickId: canonicalClickId,
        errorCode: updateError.code,
        errorMessage: updateError.message,
      });
      return { attached: false, reason: "booking_update_failed" as const };
    }
  }

  await ensureAffiliateLead({ client, bookingRequestId, affiliateId, clickId: canonicalClickId });

  console.info("[booking-attribution] booking attributed", {
    bookingRequestId,
    affiliateId,
    clickId: canonicalClickId,
    visitorSessionId,
    visitorId,
    source: options.source,
  });

  return { attached: true, mode: "canonical" as const };
}
