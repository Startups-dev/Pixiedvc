import { supabaseServer } from "@/lib/supabase-server";

export type PublicMarketMetrics = {
  marketKey: string;
  availabilityConfidence: "low" | "medium" | "high";
  typicalMatchTimeLabel: string;
  verifiedOwnersReady: number;
  bookingWindowSupported: boolean;
  updatedAt: string | null;
};

const FALLBACK_METRICS: PublicMarketMetrics = {
  marketKey: "walt-disney-world",
  availabilityConfidence: "high",
  typicalMatchTimeLabel: "6–24 hours",
  verifiedOwnersReady: 12,
  bookingWindowSupported: true,
  updatedAt: null,
};

export async function getPublicMarketMetrics(
  marketKey: string,
): Promise<PublicMarketMetrics> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("public_market_metrics")
    .select(
      "market_key, availability_confidence, typical_match_time_label, verified_owners_ready, booking_window_supported, updated_at",
    )
    .eq("market_key", marketKey)
    .maybeSingle();

  if (error || !data) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[public_market_metrics] Falling back to defaults", error);
    }
    return { ...FALLBACK_METRICS, marketKey };
  }

  return {
    marketKey: data.market_key,
    availabilityConfidence: data.availability_confidence,
    typicalMatchTimeLabel: data.typical_match_time_label,
    verifiedOwnersReady: data.verified_owners_ready,
    bookingWindowSupported: data.booking_window_supported,
    updatedAt: data.updated_at,
  };
}
