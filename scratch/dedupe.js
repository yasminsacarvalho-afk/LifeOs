import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false }, transport: ws }
);

async function run() {
  const { data, error } = await supabase.from('daily_analyses').select('id, analysis_date').order('created_at', { ascending: false });
  if (error) { console.error(error); return; }
  
  const seen = new Set();
  const toDelete = [];
  
  for (const row of data) {
    if (seen.has(row.analysis_date)) {
      toDelete.push(row.id);
    } else {
      seen.add(row.analysis_date);
    }
  }
  
  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} duplicates...`);
    for (const id of toDelete) {
      await supabase.from('daily_analyses').delete().eq('id', id);
    }
    console.log('Done!');
  } else {
    console.log('No duplicates found.');
  }
}
run();
