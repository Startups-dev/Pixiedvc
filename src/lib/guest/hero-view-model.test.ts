import { describe, expect, it } from "vitest";

import {
  buildGuestTripHeroViewModel,
  deriveNights,
  getCountdownLabel,
  resolveGuestDisplayName,
  resolveGuestTripResortImage,
} from "@/lib/guest/hero-view-model";

describe("guest trip hero view model", () => {
  it("resolves a real resort image from trusted resort mapping", () => {
    const image = resolveGuestTripResortImage({
      name: "Beach Club Villas",
      slug: "beach-club-villas",
      calculator_code: "BCV",
    });

    expect(image.url).toContain("/storage/v1/object/public/resorts/beach-club-villa/BCV2.png");
    expect(image.matchedBy).toBe("code");
  });

  it("falls back to the trusted default resort image", () => {
    const image = resolveGuestTripResortImage({
      name: "Unknown resort",
      slug: "unknown-resort",
      calculator_code: "NOPE",
    });

    expect(image.url).toContain("/storage/v1/object/public/resorts/saratoga-springs-resort/SSR2.png");
    expect(image.matchedBy).toBe("default");
  });

  it("derives nights from trusted dates", () => {
    expect(deriveNights("2026-10-10", "2026-10-17")).toBe(7);
  });

  it("formats future countdowns", () => {
    expect(getCountdownLabel("2026-10-10", new Date("2026-08-08T12:00:00Z"))).toBe(
      "63 days until check-in",
    );
  });

  it("handles tomorrow, check-in day, and past trips", () => {
    expect(getCountdownLabel("2026-10-10", new Date("2026-10-09T12:00:00Z"))).toBe(
      "Requested stay begins tomorrow",
    );
    expect(
      getCountdownLabel("2026-10-10", new Date("2026-10-09T12:00:00Z"), {
        reservationConfirmed: true,
      }),
    ).toBe(
      "Your vacation begins tomorrow",
    );
    expect(getCountdownLabel("2026-10-10", new Date("2026-10-10T12:00:00Z"))).toBe(
      "Welcome to your vacation",
    );
    expect(getCountdownLabel("2026-10-10", new Date("2026-10-11T12:00:00Z"))).toBe(
      "This trip has ended",
    );
  });

  it("builds display-only trip data without raw enum labels or owner financial fields", () => {
    const viewModel = buildGuestTripHeroViewModel({
      guestName: "Cristiano Santos",
      tripId: "trip-1",
      resort: {
        name: "Beach Club Villas",
        slug: "beach-club-villas",
        calculator_code: "BCV",
      },
      roomType: "Deluxe Studio",
      checkIn: "2026-10-10",
      checkOut: "2026-10-17",
      adults: 2,
      youths: 2,
      status: "pending_owner",
      now: new Date("2026-08-08T12:00:00Z"),
    });

    const serialized = JSON.stringify(viewModel);
    expect(viewModel.guestName).toBe("Cristiano");
    expect(viewModel.dateRangeLabel).toBe("October 10 - October 17, 2026");
    expect(viewModel.nights).toBe(7);
    expect(viewModel.partySummary).toBe("2 adults · 2 children");
    expect(viewModel.statusLabel).toBe("Your reservation is taking shape");
    expect(serialized).not.toContain("pending_owner");
    expect(serialized).not.toContain("owner_payout");
    expect(serialized).not.toContain("margin");
  });

  it("uses only trusted primary actions", () => {
    const reviewDetails = buildGuestTripHeroViewModel({
      tripId: "trip-1",
      status: "submitted",
    });
    expect(reviewDetails.primaryAction).toBeNull();

    const linkReservation = buildGuestTripHeroViewModel({
      tripId: "trip-1",
      transferConfirmed: true,
      confirmationNumber: "ABC123",
    });
    expect(linkReservation.primaryAction).toEqual({
      label: "Link your reservation",
      href: "/guides/link-to-disney-experience",
    });
  });

  it("resolves guest identity from profile fields before metadata or email", () => {
    expect(
      resolveGuestDisplayName({
        profileFullName: "Cristiano Santos",
        profileDisplayName: "Display Name",
        metadataFullName: "Metadata Name",
        email: "email.person@example.com",
      }),
    ).toBe("Cristiano");

    expect(
      resolveGuestDisplayName({
        profileDisplayName: "Cristiano Santos",
        metadataFullName: "Metadata Name",
        email: "email.person@example.com",
      }),
    ).toBe("Cristiano");

    expect(
      resolveGuestDisplayName({
        profileDisplayName: "",
        profileFullName: "Helena Aranha",
        metadataFullName: "Metadata Name",
        email: "email.person@example.com",
      }),
    ).toBe("Helena");

    expect(
      resolveGuestDisplayName({
        metadataDisplayName: "Rafaela Guest",
        metadataFullName: "Metadata Full",
        email: "email.person@example.com",
      }),
    ).toBe("Metadata");
  });

  it("does not derive guest identity from email addresses", () => {
    expect(
      resolveGuestDisplayName({
        email: "first.last+trip@example.com",
      }),
    ).toBeNull();
  });

  it("does not display honorifics, generic names, or double punctuation sources", () => {
    expect(resolveGuestDisplayName({ profileDisplayName: "Mr." })).toBeNull();
    expect(resolveGuestDisplayName({ profileDisplayName: "Guest" })).toBeNull();
    expect(resolveGuestDisplayName({ profileDisplayName: "hello" })).toBeNull();
    expect(resolveGuestDisplayName({ profileDisplayName: "Mr. Cristiano Santos" })).toBe("Cristiano");
    expect(
      buildGuestTripHeroViewModel({
        tripId: "trip-1",
        profileDisplayName: "Mr.",
        email: null,
      }).guestName,
    ).toBeNull();
  });

  it("uses specific guest-facing status labels instead of generic action needed", () => {
    expect(buildGuestTripHeroViewModel({ tripId: "trip-1", status: "contract_sent" }).statusLabel).toBe(
      "Agreement needs your signature",
    );
    expect(buildGuestTripHeroViewModel({ tripId: "trip-1", status: "draft" }).statusLabel).toBe(
      "Traveler details needed",
    );
    expect(
      buildGuestTripHeroViewModel({
        tripId: "trip-1",
        status: "draft",
        travelerDetailsComplete: true,
      }).statusLabel,
    ).toBe("Owner match in progress");
    expect(buildGuestTripHeroViewModel({ tripId: "trip-1", status: "submitted" }).statusLabel).toBe(
      "Owner match in progress",
    );
    expect(buildGuestTripHeroViewModel({ tripId: "trip-1", status: "paid" }).statusLabel).toBe(
      "Disney confirmation pending",
    );
  });
});
