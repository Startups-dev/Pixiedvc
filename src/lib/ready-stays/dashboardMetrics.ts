export type ReadyStayDashboardMetricsRow = {
  status: string | null;
  sold_at?: string | null;
  listed_at?: string | null;
  created_at: string | null;
  owner_price_per_point_cents: number | null;
  points: number | null;
  deleted_at?: string | null;
  archived_at?: string | null;
};

export type ReadyStayDashboardMetrics = {
  activeListings: number;
  soldThisYear: number;
  totalRevenueCents: number;
  avgTimeToSellDays: number | null;
};

function parseTimestamp(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getUtcYearBounds(reference: Date) {
  const year = reference.getUTCFullYear();
  return {
    start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0)),
  };
}

export function computeReadyStayDashboardMetrics(
  rows: ReadyStayDashboardMetricsRow[],
  now: Date = new Date(),
): ReadyStayDashboardMetrics {
  const referenceDate = now;
  const { start, end } = getUtcYearBounds(referenceDate);
  const activeListings = rows.filter(
    (row) => row.status !== "sold" && !row.deleted_at && !row.archived_at,
  ).length;

  const soldRowsThisYear = rows.filter((row) => {
    if (row.status !== "sold") return false;
    const soldAt = parseTimestamp(row.sold_at ?? null);
    if (!soldAt) return false;
    return soldAt >= start && soldAt < end;
  });

  const soldThisYear = soldRowsThisYear.length;
  const totalRevenueCents = soldRowsThisYear.reduce((sum, row) => {
    const ownerPrice = Number(row.owner_price_per_point_cents ?? 0);
    const points = Number(row.points ?? 0);
    if (!Number.isFinite(ownerPrice) || !Number.isFinite(points)) return sum;
    return sum + Math.round(ownerPrice * points);
  }, 0);

  let durationSumDays = 0;
  let durationCount = 0;
  for (const row of soldRowsThisYear) {
    const soldAt = parseTimestamp(row.sold_at ?? null);
    const listedAt = parseTimestamp((row.listed_at ?? row.created_at) ?? null);
    if (!soldAt || !listedAt) continue;
    const durationDays = (soldAt.getTime() - listedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (durationDays < 0) {
      console.warn("[ready-stays/dashboardMetrics] negative duration excluded", {
        sold_at: row.sold_at,
        listed_at: row.listed_at,
        created_at: row.created_at,
      });
      continue;
    }
    durationSumDays += durationDays;
    durationCount += 1;
  }

  const avgTimeToSellDays = durationCount > 0 ? Math.round(durationSumDays / durationCount) : null;

  return {
    activeListings,
    soldThisYear,
    totalRevenueCents,
    avgTimeToSellDays,
  };
}
