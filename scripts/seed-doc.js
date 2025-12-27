const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing env');
}

const client = createClient(url, key);

(async () => {
  const ownerId = 'e61be5b6-3539-405b-abd4-9918a08f2cdf';
  const file = fs.readFileSync('public/images/pixie-logo.png');
  const path = `${ownerId}/sample-${Date.now()}.png`;

  const upload = await client.storage.from('owner-docs').upload(path, file, { contentType: 'image/png' });
  console.log('upload', upload);  

  if (!upload.error) {
    const insert = await client.from('owner_documents').insert({ owner_id: ownerId, kind: 'member_card', storage_path: path });
    console.log('insert', insert);
  }
})();
