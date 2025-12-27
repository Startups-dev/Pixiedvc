import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing env');
}

const client = createClient(url, key);

(async () => {
  const ownerId = 'e61be5b6-3539-405b-abd4-9918a08f2cdf';
  const path = `${ownerId}/sample.jpg`;

  const { error } = await client.from('owner_documents').insert({
    owner_id: ownerId,
    kind: 'member_card',
    storage_path: path,
  });

  console.log({ error });
})();
