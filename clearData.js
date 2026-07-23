import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import ws from 'ws';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function main() {
  console.log("Deleting cash closings...");
  let res = await supabase.from('cash_closings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(res.error || "Done");

  console.log("Deleting sales...");
  res = await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(res.error || "Done");

  console.log("Deleting packages...");
  res = await supabase.from('packages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(res.error || "Done");

  console.log("Deleting shifts...");
  res = await supabase.from('shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log(res.error || "Done");

  console.log("Data cleared.");
}

main();
