import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client = createClient(url, key);

const { data, error } = await client
  .from('owner_comments')
  .insert({ owner_id: 'test', author_id: 'test', body: 'hello', kind: 'note' });

console.log({ data, error });
