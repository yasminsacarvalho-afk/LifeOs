import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('pos_studies').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(error ? "Error: " + JSON.stringify(error) : "Data:\n" + JSON.stringify(data, null, 2));
}
run();
