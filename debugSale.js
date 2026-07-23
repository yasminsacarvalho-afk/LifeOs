import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import ws from 'ws';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function main() {
  const { data, error } = await supabase.from('sales').insert({
    amount: 150,
    commission_amount: 12,
    sale_date: "2026-06-01",
    company_id: null,
    trip_id: null,
    seller_id: null
  });
  console.log("Error:", JSON.stringify(error, null, 2));
}

main();
