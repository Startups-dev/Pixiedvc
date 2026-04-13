import LastMinuteDealsClient, {
  type LastMinuteDeal,
} from "@/components/last-minute-deals/LastMinuteDealsClient";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export default async function LastMinuteDealsPage() {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const startDate = toDateOnly(now);
  const maxWindow = new Date(now);
  maxWindow.setDate(maxWindow.getDate() + 60);
  const endDate = toDateOnly(maxWindow);

  const { data } = await supabase
    .from("ready_stays")
    .select(
      "id, check_in, check_out, points, room_type, guest_price_per_point_cents, original_guest_price_per_point_cents, price_reduced_at, image_url, status, expires_at, sleeps, created_at, resorts(name, slug)",
    )
    .eq("status", "active")
    .gte("check_in", startDate)
    .lte("check_in", endDate)
    .order("check_in", { ascending: true });

  const activeDeals: LastMinuteDeal[] = ((data ?? []) as Array<Record<string, unknown>>)
    .filter((row) => {
      const expiresAt = typeof row.expires_at === "string" ? row.expires_at : null;
      if (!expiresAt) return true;
      const expiresDate = new Date(expiresAt);
      return !Number.isNaN(expiresDate.getTime()) && expiresDate.getTime() > now.getTime();
    })
    .map((row) => {
      const checkIn = typeof row.check_in === "string" ? row.check_in : null;
      const checkOut = typeof row.check_out === "string" ? row.check_out : null;
      const points = Number(row.points ?? 0);
      const ppp = Number(row.guest_price_per_point_cents ?? 0);
      const totalCents = Number.isFinite(points) && Number.isFinite(ppp) ? points * ppp : null;
      const originalPpp = Number(row.original_guest_price_per_point_cents ?? 0);
      const originalTotalCents =
        originalPpp > 0 && originalPpp > ppp && Number.isFinite(points) ? originalPpp * points : null;
      const roomType = typeof row.room_type === "string" && row.room_type.trim() ? row.room_type : "Villa";
      const sleeps = Number.isFinite(Number(row.sleeps)) && Number(row.sleeps) > 0 ? Number(row.sleeps) : 4;
      const resort =
        row.resorts && typeof row.resorts === "object" && row.resorts !== null
          ? (row.resorts as { name?: string | null; slug?: string | null })
          : null;
      const resortName = resort?.name?.trim() || "Disney Resort";

      return {
        id: String(row.id ?? ""),
        resortName,
        resortSlug: resort?.slug ?? null,
        checkIn,
        checkOut,
        nights: nightsBetween(checkIn, checkOut),
        sleeps,
        roomType,
        totalPriceCents: totalCents && totalCents > 0 ? totalCents : null,
        originalTotalPriceCents: originalTotalCents && originalTotalCents > 0 ? originalTotalCents : null,
        pricePerPointCents: ppp > 0 ? ppp : null,
        imageUrl:
          (typeof row.image_url === "string" && row.image_url.trim()) ||
          "/images/castle-hero.png",
        createdAt: typeof row.created_at === "string" ? row.created_at : null,
      };
    })
    .filter((row) => row.id.length > 0)
    .sort((a, b) => {
      const checkInDelta = (a.checkIn ?? "").localeCompare(b.checkIn ?? "");
      if (checkInDelta !== 0) return checkInDelta;
      return Number(Boolean(b.originalTotalPriceCents)) - Number(Boolean(a.originalTotalPriceCents));
    });

  return <LastMinuteDealsClient deals={activeDeals} />;
}
