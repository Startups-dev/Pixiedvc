import { describe, expect, test } from "vitest";

import { canOwnerViewMatchGuestContact, isOwnerRentalDocumentStoragePath } from "./security";

describe("owner security helpers", () => {
  test("hides match guest contact details until an accepted or rental-backed workflow exists", () => {
    expect(canOwnerViewMatchGuestContact({ matchStatus: "pending_owner", rentalId: null })).toBe(false);
    expect(canOwnerViewMatchGuestContact({ matchStatus: "declined", rentalId: null })).toBe(false);
    expect(canOwnerViewMatchGuestContact({ matchStatus: "accepted", rentalId: null })).toBe(true);
    expect(canOwnerViewMatchGuestContact({ matchStatus: "booked", rentalId: null })).toBe(true);
    expect(canOwnerViewMatchGuestContact({ matchStatus: "pending_owner", rentalId: "rental-1" })).toBe(true);
  });

  test("accepts only authenticated owner rental document storage paths", () => {
    expect(
      isOwnerRentalDocumentStoragePath({
        storagePath: "owners/owner-user-1/rental-docs/rental-1/disney_confirmation_email/file.pdf",
        userId: "owner-user-1",
        rentalId: "rental-1",
      }),
    ).toBe(true);

    expect(
      isOwnerRentalDocumentStoragePath({
        storagePath: "owners/owner-user-2/rental-docs/rental-1/disney_confirmation_email/file.pdf",
        userId: "owner-user-1",
        rentalId: "rental-1",
      }),
    ).toBe(false);

    expect(
      isOwnerRentalDocumentStoragePath({
        storagePath: "owners/owner-user-1/rental-docs/rental-2/disney_confirmation_email/file.pdf",
        userId: "owner-user-1",
        rentalId: "rental-1",
      }),
    ).toBe(false);
  });
});
