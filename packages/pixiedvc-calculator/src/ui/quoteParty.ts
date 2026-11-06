export function normalizeQuoteParty(adults?: number, children?: number) {
  return {
    adults: typeof adults === "number" && Number.isFinite(adults) ? Math.max(1, Math.floor(adults)) : 1,
    children: typeof children === "number" && Number.isFinite(children) ? Math.max(0, Math.floor(children)) : 0,
  };
}
