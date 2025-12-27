import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  // Get the current session user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!existingProfile) {
    // Create a new profile WITH EMAIL SAVED
    await supabase.from('profiles').insert({
      id: user.id,
      display_name: user.user_metadata.full_name ?? null,
      email: user.email ?? null,          // << IMPORTANT
      avatar_url: user.user_metadata.avatar_url ?? null,
      created_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ success: true });
}

