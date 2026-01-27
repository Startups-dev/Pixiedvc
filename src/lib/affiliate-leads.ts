import { cookies } from "next/headers";

import { supabaseServer } from "@/lib/supabase-server";
import { readAffiliateCookies } from "@/lib/affiliate-cookies";

export async function attachAffiliateLead(bookingRequestId: string) {
  const cookieStore = await cookies();
  const attribution = readAffiliateCookies(cookieStore);
  if (!attribution) {
    return;
  }

  const supabase = await supabaseServer();
  const { data: existing } = await supabase
    .from("affiliate_leads")
    .select("id")
    .eq("booking_request_id", bookingRequestId)
    .maybeSingle();

  if (existing?.id) {
    return;
  }

  const { error } = await supabase.from("affiliate_leads").insert({
    affiliate_id: attribution.affiliateId,
    click_id: attribution.clickId ?? null,
    booking_request_id: bookingRequestId,
  });

  if (error) {
    console.warn("[affiliate] Lead insert failed", error.message);
  }
}
