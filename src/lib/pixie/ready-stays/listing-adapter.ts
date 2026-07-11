import { isPublicReadyStayRow } from "@/lib/ready-stays/visibility";
import { getReadyStayListingPrice } from "@/lib/pixie/pricing/guest-price-adapter";
import { normalizeRoomTypeIdentifier } from "@/lib/pixie/resorts/room-types";
import { resolvePixieResortId } from "@/lib/pixie/resorts/identifiers";
import { calculateReadyStayNights } from "@/lib/pixie/ready-stays/date-matching";
import type {
  PixieReadyStayAdapterResult,
  PixieReadyStayListing,
  PixieReadyStayListingSourceRow,
  PixieReadyStaySubProperty,
} from "@/lib/pixie/ready-stays/types";

function clean(value?: string | null) {
  return (value ?? "").trim();
}

function inferSubProperty(row: PixieReadyStayListingSourceRow): PixieReadyStaySubProperty {
  const text = [row.resorts?.slug, row.resorts?.name, row.title, row.room_type].map((value) => clean(value).toLowerCase()).join(" ");
  if (text.includes("kidani")) return "kidani";
  if (text.includes("jambo")) return "jambo";
  return "unknown";
}

export function normalizeReadyStayListing(
  row: PixieReadyStayListingSourceRow,
  options: { nowMs?: number; today?: string } = {},
): PixieReadyStayAdapterResult {
  const listingId = clean(row.id);
  if (!listingId) return { ok: false, code: "malformed_listing", message: "Ready Stay id is required." };
  if (!isPublicReadyStayRow(row, options.nowMs, options.today)) {
    return { ok: false, code: "private_listing", listingId, message: "Ready Stay is not public-visible." };
  }

  const resolverInput = row.resorts?.slug || row.resorts?.calculator_code || row.resorts?.name;
  const resolved = resolvePixieResortId(resolverInput);
  if (!resolved.ok) {
    return {
      ok: false,
      code: resolved.code === "ambiguous_resort_identifier" ? "ambiguous_resort_identifier" : "unsupported_resort_identifier",
      listingId,
      message: resolved.message,
    };
  }

  const numberOfNights = calculateReadyStayNights(row.check_in, row.check_out);
  if (!numberOfNights) return { ok: false, code: "malformed_dates", listingId, message: "Ready Stay date range is invalid." };

  const sleeps = Number(row.sleeps ?? 0);
  if (!Number.isFinite(sleeps) || sleeps <= 0) return { ok: false, code: "missing_capacity", listingId, message: "Ready Stay sleeps capacity is missing." };

  const points = Number(row.points ?? 0);
  const price = getReadyStayListingPrice({
    pricingContext: "ready_stay_listing_price",
    readyStayId: listingId,
    points,
    guestPricePerPointCents: row.guest_price_per_point_cents,
    isTestListing: row.is_test_listing,
    testGuestTotalCents: row.test_guest_total_cents,
  });

  const warnings: PixieReadyStayListing["warnings"] = ["inventory_may_change", "recheck_required_before_booking"];
  if (row.is_test_listing) warnings.push("visible_test_listing");
  const supportedListingPrice = price.supported && price.pricingContext === "ready_stay_listing_price" ? price : null;
  if (!supportedListingPrice) warnings.push("listing_price_unavailable");

  const roomTypeId = normalizeRoomTypeIdentifier(row.room_type);
  if (!roomTypeId) warnings.push("unknown_room_mapping");
  const subProperty = resolved.resort.id === "akv" ? inferSubProperty(row) : "unknown";
  if (resolved.resort.id === "akv" && subProperty === "unknown") warnings.push("unknown_sub_property");

  return {
    ok: true,
    listing: {
      listingId,
      resortId: resolved.resort.id,
      canonicalResortSlug: resolved.resort.slug,
      displayResortName: clean(row.resorts?.name) || resolved.resort.displayName,
      subProperty,
      roomTypeId: roomTypeId ?? undefined,
      roomDisplayName: clean(row.room_type) || "Ready Stay room",
      arrivalDate: row.check_in,
      departureDate: row.check_out,
      numberOfNights,
      sleeps,
      points,
      listingPriceCents: supportedListingPrice ? supportedListingPrice.confirmedListingTotalCents : undefined,
      ratePerPointCents: supportedListingPrice ? supportedListingPrice.ratePerPointCents : undefined,
      currency: "USD",
      status: clean(row.status) || "active",
      visibilityStatus: "public_visible",
      bookingPath: clean(row.href) || `/ready-stays/${listingId}/book`,
      imageReference: clean(row.image_url) || undefined,
      isTestListing: Boolean(row.is_test_listing),
      sourceUpdatedAt: clean(row.updated_at) || undefined,
      warnings,
    },
  };
}
