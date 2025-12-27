import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client = createClient(url, key);

const ownerId = 'e61be5b6-3539-405b-abd4-9918a08f2cdf';
const filePath = 'public/images/pixie-logo.png';
const file = fs.readFileSync(filePath);
const path = `${ownerId}/sample-${Date.now()}.png`;

const upload = await client.storage.from('owner-docs').upload(path, file, {
  contentType: 'image/png',
});

console.log('upload', upload.error ?? upload.data);

if (!upload.error) {
  const { error } = await client.from('owner_documents').insert({
    owner_id: ownerId,
    kind: 'member_card',
    storage_path: path,
  });
  console.log('insert doc', error ?? 'ok');
}
