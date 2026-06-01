import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function main() {
  const { data, error } = await supabase
    .from('customer_services')
    .select('id, customer_id, reference_id, category, status, details, financials, created_at')
    .limit(1);

  if (error) {
    console.error('Supabase Error:', error);
  } else {
    console.log('Success:', data);
  }
}
main();
