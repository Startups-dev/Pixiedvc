import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { ensureAnalyticsSession } from "@/lib/analytics/server";
import { sanitizePath, sanitizeReferrer } from "@/lib/analytics/shared";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createServiceClient } from "@/lib/supabase-service-client";

type NullableUtm = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
};

export type AffiliateClickAttributionInput = NullableUtm & {
  ref: string;
  clickId: string;
  visitorId?: string | null;
  visitorSessionId?: string | null;
  landingPath?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  headers: Headers;
};

type AffiliateClickAttributionResult =
  | {
      ok: true;
      affiliateRef: string;
      affiliateId: string;
      clickId: string;
      visitorId: string;
      visitorSessionId: string;
      visitorSessionRowId: string | null;
    }
  | { ok: false; status: 404; reason: "affiliate_not_found" }
  | { ok: false; status: 400; reason: "click_insert_failed"; message: string };

function getAffiliateAttributionClient() {
  return getSupabaseAdminClient() ?? createServiceClient();
}

function normalizeText(value: string | null | undefined, maxLength: number) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeAnalyticsId(value: string | null | undefined) {
  return normalizeText(value, 128);
}

function normalizeUtm(value: string | null | undefined) {
  return normalizeText(value, 255);
}

function isMissingCanonicalAffiliateClickColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  const details = "details" in error && typeof error.details === "string" ? error.details : "";
  const combined = `${message} ${details}`.toLowerCase();

  return (
    combined.includes("affiliate_clicks") &&
    (combined.includes("visitor_session_row_id") ||
      combined.includes("visitor_session_id") ||
      combined.includes("visitor_id") ||
      combined.includes("utm_source") ||
      combined.includes("schema cache"))
  );
}

async function resolveAffiliate(client: SupabaseClient, ref: string) {
  const { data, error } = await client.rpc("resolve_affiliate", { slug_or_code: ref });
  if (error || !data || data.length === 0) return null;
  return data[0]?.affiliate_id as string | undefined;
}

async function upsertAffiliateClick(
  client: SupabaseClient,
  input: {
    affiliateId: string;
    clickId: string;
    clickedAt: string;
    landingPath: string;
    referrer: string | null;
    userAgent: string | null;
    visitorId: string;
    visitorSessionId: string;
    visitorSessionRowId: string | null;
    utm: NullableUtm;
  },
) {
  const canonicalPayload = {
    affiliate_id: input.affiliateId,
    click_id: input.clickId,
    clicked_at: input.clickedAt,
    landing_path: input.landingPath,
    referrer: input.referrer,
    user_agent: input.userAgent,
    visitor_id: input.visitorId,
    visitor_session_id: input.visitorSessionId,
    visitor_session_row_id: input.visitorSessionRowId,
    utm_source: input.utm.utmSource,
    utm_medium: input.utm.utmMedium,
    utm_campaign: input.utm.utmCampaign,
    utm_term: input.utm.utmTerm,
    utm_content: input.utm.utmContent,
  };

  const canonical = await client
    .from("affiliate_clicks")
    .upsert(canonicalPayload, { onConflict: "click_id", ignoreDuplicates: true });

  if (!canonical.error || !isMissingCanonicalAffiliateClickColumn(canonical.error)) {
    return canonical;
  }

  console.warn("[affiliate-attribution] canonical click columns unavailable; using legacy click payload", {
    affiliateId: input.affiliateId,
    clickId: input.clickId,
    visitorSessionId: input.visitorSessionId,
    visitorId: input.visitorId,
    landingPath: input.landingPath,
    errorCode: canonical.error.code,
    errorMessage: canonical.error.message,
  });

  return client.from("affiliate_clicks").upsert(
    {
      affiliate_id: input.affiliateId,
      click_id: input.clickId,
      clicked_at: input.clickedAt,
      landing_path: input.landingPath,
      referrer: input.referrer,
      user_agent: input.userAgent,
    },
    { onConflict: "click_id", ignoreDuplicates: true },
  );
}

export async function recordAffiliateClickAttribution(
  input: AffiliateClickAttributionInput,
): Promise<AffiliateClickAttributionResult> {
  const ref = normalizeText(input.ref, 128);
  const clickId = normalizeText(input.clickId, 128);
  if (!ref || !clickId) {
    return { ok: false, status: 400, reason: "click_insert_failed", message: "Missing referral or click id." };
  }

  const client = getAffiliateAttributionClient();
  const affiliateId = await resolveAffiliate(client, ref);
  if (!affiliateId) {
    return { ok: false, status: 404, reason: "affiliate_not_found" };
  }

  const visitorId = normalizeAnalyticsId(input.visitorId) ?? `affiliate-${clickId}`;
  const visitorSessionId = normalizeAnalyticsId(input.visitorSessionId) ?? clickId;
  const landingPath = sanitizePath(input.landingPath) ?? "/";
  const referrer = sanitizeReferrer(input.referrer, input.headers.get("host"));
  const userAgent = normalizeText(input.userAgent, 1024);
  const utm: NullableUtm = {
    utmSource: normalizeUtm(input.utmSource),
    utmMedium: normalizeUtm(input.utmMedium),
    utmCampaign: normalizeUtm(input.utmCampaign),
    utmTerm: normalizeUtm(input.utmTerm),
    utmContent: normalizeUtm(input.utmContent),
  };

  let visitorSessionRowId: string | null = null;
  try {
    const session = await ensureAnalyticsSession({
      visitorId,
      sessionId: visitorSessionId,
      path: landingPath,
      referrer,
      ...utm,
      headers: input.headers,
    });
    visitorSessionRowId = session.id;
  } catch (error) {
    console.warn("[affiliate-attribution] visitor session link failed", {
      affiliateId,
      clickId,
      visitorSessionId,
      visitorId,
      landingPath,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }

  const clickedAt = new Date().toISOString();
  const { error } = await upsertAffiliateClick(client, {
    affiliateId,
    clickId,
    clickedAt,
    landingPath,
    referrer,
    userAgent,
    visitorId,
    visitorSessionId,
    visitorSessionRowId,
    utm,
  });

  if (error) {
    console.warn("[affiliate-attribution] click insert failed", {
      affiliateId,
      clickId,
      visitorSessionId,
      visitorId,
      landingPath,
      errorCode: error.code,
      errorMessage: error.message,
    });
    return { ok: false, status: 400, reason: "click_insert_failed", message: error.message };
  }

  console.info("[affiliate-attribution] click captured", {
    affiliateId,
    clickId,
    visitorSessionId,
    visitorId,
    landingPath,
  });

  return {
    ok: true,
    affiliateRef: ref,
    affiliateId,
    clickId,
    visitorId,
    visitorSessionId,
    visitorSessionRowId,
  };
}
