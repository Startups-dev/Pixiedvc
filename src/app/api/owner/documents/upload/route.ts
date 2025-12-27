import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

const BUCKET = 'owner-docs';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const kind = (formData.get('kind') as string) ?? 'document';

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Please attach a document.' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const path = `${user.id}/${Date.now()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (upload.error) {
    return NextResponse.json({ error: upload.error.message }, { status: 400 });
  }

  const { error } = await supabase.from('owner_documents').insert({
    owner_id: user.id,
    kind,
    storage_path: path,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
