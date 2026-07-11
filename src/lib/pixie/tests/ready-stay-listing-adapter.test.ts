import { describe, expect, it } from "vitest";

import { normalizeReadyStayListing } from "@/lib/pixie/ready-stays/listing-adapter";
import { getPublicReadyStaysForPixie } from "@/lib/pixie/ready-stays/visibility-adapter";
import { makeReadyStayRow } from "@/lib/pixie/tests/ready-stay-test-helpers";

describe("Ready Stay listing adapter", () => {
  it("normalizes a valid public listing with listing-price context", () => {
    const result = normalizeReadyStayListing(makeReadyStayRow(), { today: "2026-07-11" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.listing.listingId).toBe("ready-1");
    expect(result.listing.resortId).toBe("rva");
    expect(result.listing.numberOfNights).toBe(5);
    expect(result.listing.listingPriceCents).toBe(300000);
    expect(result.listing.ratePerPointCents).toBe(2500);
    expect(result.listing.warnings).toContain("recheck_required_before_booking");
  });

  it("rejects hidden, expired, sold, booked, locked, and admin-only rows through public visibility", async () => {
    const rows = [
      makeReadyStayRow({ id: "hidden", status: "test", is_test_listing: true, is_visible_publicly: false }),
      makeReadyStayRow({ id: "expired", check_out: "2026-01-01" }),
      makeReadyStayRow({ id: "sold", status: "sold" }),
      makeReadyStayRow({ id: "locked", locked_until: "2026-07-11T13:00:00.000Z" }),
      makeReadyStayRow({ id: "proof", verification_status: "proof_uploaded" }),
      makeReadyStayRow({ id: "visible" }),
    ];
    const result = await getPublicReadyStaysForPixie({ rows, today: "2026-07-11", nowMs: Date.parse("2026-07-11T12:00:00.000Z") });
    expect(result.listings.map((listing) => listing.listingId)).toEqual(["visible"]);
    expect(result.excluded).toHaveLength(5);
  });

  it("allows visible test listings and applies test listing total", () => {
    const result = normalizeReadyStayListing(
      makeReadyStayRow({ is_test_listing: true, is_visible_publicly: true, test_guest_total_cents: 123456 }),
      { today: "2026-07-11" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.listing.isTestListing).toBe(true);
    expect(result.listing.listingPriceCents).toBe(123456);
    expect(result.listing.warnings).toContain("visible_test_listing");
  });

  it("rejects malformed dates and missing capacity", () => {
    expect(normalizeReadyStayListing(makeReadyStayRow({ check_out: "2026-10-01" }), { today: "2026-07-11" }).ok).toBe(false);
    expect(normalizeReadyStayListing(makeReadyStayRow({ sleeps: null }), { today: "2026-07-11" }).ok).toBe(false);
  });

  it("does not expose owner payout or lock tokens in normalized output", () => {
    const result = normalizeReadyStayListing(makeReadyStayRow(), { today: "2026-07-11" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect("owner_price_per_point_cents" in result.listing).toBe(false);
    expect("lock_session_id" in result.listing).toBe(false);
  });

  it("preserves AKV Kidani and Jambo as subProperty metadata", () => {
    const kidani = normalizeReadyStayListing(
      makeReadyStayRow({
        resorts: { name: "Disney's Animal Kingdom Villas - Kidani Village", slug: "animal-kingdom-kidani", calculator_code: "AKV" },
        title: "Kidani Village Ready Stay",
      }),
      { today: "2026-07-11" },
    );
    const jambo = normalizeReadyStayListing(
      makeReadyStayRow({
        id: "jambo",
        resorts: { name: "Disney's Animal Kingdom Villas - Jambo House", slug: "animal-kingdom-jambo", calculator_code: "AKV" },
        title: "Jambo House Ready Stay",
      }),
      { today: "2026-07-11" },
    );
    expect(kidani.ok && kidani.listing.resortId).toBe("akv");
    expect(kidani.ok && kidani.listing.subProperty).toBe("kidani");
    expect(jambo.ok && jambo.listing.subProperty).toBe("jambo");
  });

  it("fails closed for bare ambiguous KV", () => {
    const result = normalizeReadyStayListing(
      makeReadyStayRow({ resorts: { name: "Kidani", slug: "kidani", calculator_code: "KV" } }),
      { today: "2026-07-11" },
    );
    expect(result.ok).toBe(false);
  });
});
