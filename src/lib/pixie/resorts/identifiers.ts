import { FALLBACK_CALC_CODE_BY_SLUG, resolveCalculatorCode } from "@/lib/resort-calculator";
import { canonicalizeResortSlug } from "@/lib/resorts/canonical";
import {
  PIXIE_NON_WDW_CALCULATOR_CODES,
  PIXIE_UNSUPPORTED_WDW_RESORTS,
  PIXIE_WDW_RESORT_CATALOG,
} from "@/lib/pixie/resorts/catalog";
import type { PixieIdentifierResult, PixieResortCatalogItem, PixieResortId } from "@/lib/pixie/resorts/types";

function normalizeIdentifier(input: string | null | undefined) {
  return (input ?? "").trim().toLowerCase();
}

function compact(input: string) {
  return input.toLowerCase().replace(/disney(?:s)?/g, "").replace(/[^a-z0-9]/g, "");
}

function matchesResort(resort: PixieResortCatalogItem, normalized: string) {
  const upper = normalized.toUpperCase();
  const canonicalSlug = canonicalizeResortSlug(normalized);
  return (
    resort.id === normalized ||
    resort.slug === canonicalSlug ||
    resort.aliases.includes(canonicalSlug) ||
    resort.calculatorCode.toUpperCase() === upper ||
    compact(resort.displayName) === compact(normalized) ||
    compact(resort.shortName) === compact(normalized)
  );
}

export function resolvePixieResortId(input: string | null | undefined): PixieIdentifierResult {
  const normalized = normalizeIdentifier(input);
  if (!normalized) {
    return { ok: false, code: "unknown_resort_identifier", input: "", message: "Resort identifier is required." };
  }

  const upper = normalized.toUpperCase();
  if (upper === "KV" || normalized === "kidani" || normalized === "jambo") {
    return {
      ok: false,
      code: "ambiguous_resort_identifier",
      input: normalized,
      message: "Kidani and Jambo are AKV building preferences in Pixie, not standalone trusted resort identities.",
    };
  }
  if ((PIXIE_NON_WDW_CALCULATOR_CODES as readonly string[]).includes(upper)) {
    return { ok: false, code: "unsupported_non_wdw_resort", input: normalized, message: "Pixie v1 supports Walt Disney World DVC resorts only." };
  }
  if (PIXIE_UNSUPPORTED_WDW_RESORTS.some((item) => item.slug === normalized || item.calculatorCode.toLowerCase() === normalized)) {
    return { ok: false, code: "unsupported_resort", input: normalized, message: "This WDW resort is not fully supported by calculator metadata yet." };
  }
  const fallbackCode = FALLBACK_CALC_CODE_BY_SLUG[canonicalizeResortSlug(normalized)];
  if (fallbackCode && (PIXIE_NON_WDW_CALCULATOR_CODES as readonly string[]).includes(fallbackCode)) {
    return { ok: false, code: "unsupported_non_wdw_resort", input: normalized, message: "Pixie v1 supports Walt Disney World DVC resorts only." };
  }

  const matches = PIXIE_WDW_RESORT_CATALOG.filter((resort) => matchesResort(resort, normalized));
  if (matches.length === 1) return { ok: true, resort: matches[0] };
  if (matches.length > 1) {
    return { ok: false, code: "ambiguous_resort_identifier", input: normalized, message: "Resort identifier matched more than one Pixie resort." };
  }
  return { ok: false, code: "unknown_resort_identifier", input: normalized, message: "Unknown Pixie resort identifier." };
}

export function getPixieResortById(id: PixieResortId | string | null | undefined) {
  return PIXIE_WDW_RESORT_CATALOG.find((resort) => resort.id === id) ?? null;
}

export function getPixieResortBySlug(slug: string | null | undefined) {
  const canonical = canonicalizeResortSlug(normalizeIdentifier(slug));
  return PIXIE_WDW_RESORT_CATALOG.find((resort) => resort.slug === canonical || resort.aliases.includes(canonical)) ?? null;
}

export function getCalculatorCodeForPixieResort(id: PixieResortId | string | null | undefined) {
  const resort = getPixieResortById(id);
  return resort ? resolveCalculatorCode({ slug: resort.slug, calculator_code: resort.calculatorCode }) : null;
}

export function getBookingValueForPixieResort(id: PixieResortId | string | null | undefined) {
  return getPixieResortById(id)?.bookingValue ?? null;
}
