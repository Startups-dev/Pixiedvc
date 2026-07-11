import type { PixieTripState } from "@/lib/pixie/schema";
import type { PixieReadyStayCapacityMatch } from "@/lib/pixie/ready-stays/types";

export function getPixieReadyStayPartySize(party: PixieTripState["party"]) {
  return party.totalPartySize ?? (party.adultCount ?? party.adults ?? 0) + (party.childCount ?? party.children ?? 0);
}

export function evaluateReadyStayCapacity(params: {
  party: PixieTripState["party"];
  sleeps?: number | null;
}): PixieReadyStayCapacityMatch {
  const requiredCapacity = getPixieReadyStayPartySize(params.party);
  const listingCapacity = Number(params.sleeps ?? 0);

  if (!Number.isFinite(listingCapacity) || listingCapacity <= 0) {
    return {
      capacityStatus: "unknown",
      requiredCapacity,
      fitsParty: false,
      confidence: "missing",
      warnings: ["Ready Stay capacity is missing; Pixie must fail closed."],
    };
  }

  const spareCapacity = listingCapacity - requiredCapacity;
  const fitsParty = requiredCapacity > 0 && spareCapacity >= 0;
  return {
    capacityStatus: fitsParty ? "fits" : "insufficient",
    requiredCapacity,
    listingCapacity,
    fitsParty,
    spareCapacity,
    confidence: "verified",
    warnings: fitsParty ? [] : ["Ready Stay sleeping capacity is below the planner party size."],
  };
}
