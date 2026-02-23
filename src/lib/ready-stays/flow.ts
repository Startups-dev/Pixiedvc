import type { SupabaseClient } from '@supabase/supabase-js';

export async function isReadyStayBookingRequest(
  supabase: SupabaseClient,
  bookingRequestId: string | null | undefined,
) {
  if (!bookingRequestId) return false;

  const { data, error } = await supabase
    .from('ready_stays')
    .select('id')
    .eq('booking_request_id', bookingRequestId)
    .limit(1)
    .maybeSingle();

  if (error) {
    return false;
  }

  return Boolean(data?.id);
}
