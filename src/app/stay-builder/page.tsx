import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import StayBuilderClient from './stay-builder-client';
import { createServer } from '@/lib/supabase';

type GuestRow = {
  id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  age_category: 'adult' | 'youth' | null;
};

export default async function StayBuilderPage() {
  const cookieStore = await cookies();
  const supabase = createServer(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/stay-builder');
  }

  const { data: draftRows } = await supabase
    .from('booking_requests')
    .select(
      'id, status, check_in, check_out, nights, primary_resort_id, primary_room, primary_view, requires_accessibility, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, address_line2, city, state, postal_code, country, marketing_source, comments, adults, youths, accepted_terms, accepted_insurance',
    )
    .eq('renter_id', user.id)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1);

  let draft = draftRows?.[0] ?? null;

  if (!draft) {
    const { data: inserted } = await supabase
      .from('booking_requests')
      .insert({ renter_id: user.id, lead_guest_email: user.email })
      .select(
        'id, status, check_in, check_out, nights, primary_resort_id, primary_room, primary_view, requires_accessibility, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, address_line2, city, state, postal_code, country, marketing_source, comments, adults, youths, accepted_terms, accepted_insurance',
      )
      .single();
    draft = inserted;
  }

  const { data: resorts } = await supabase
    .from('resorts')
    .select('id, slug, name, location, card_image, calculator_code')
    .order('name');

  const { data: guestRows } = draft
    ? await supabase
        .from('booking_request_guests')
        .select('id, title, first_name, last_name, email, phone, age_category')
        .eq('booking_id', draft.id)
        .order('created_at', { ascending: true })
    : { data: [] };

  return <StayBuilderClient userEmail={user.email ?? ''} draft={draft!} resorts={resorts ?? []} guests={(guestRows ?? []) as GuestRow[]} />;
}
