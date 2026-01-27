export function calculateCommission(totalAmount: number | null | undefined, commissionRate: number | null | undefined) {
  const base = Number(totalAmount ?? 0);
  const rate = Number(commissionRate ?? 0);
  if (!Number.isFinite(base) || !Number.isFinite(rate)) return 0;
  return Math.round(base * rate * 100) / 100;
}
