import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client = createClient(url, key);

const ownerId = 'e61be5b6-3539-405b-abd4-9918a08f2cdf';

const { data, error } = await client.from('owners').insert({ id: ownerId, verification: 'pending', created_at: new Date().toISOString() });

console.log({ data, error });
